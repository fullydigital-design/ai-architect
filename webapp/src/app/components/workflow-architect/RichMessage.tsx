/**
 * RichMessage — Enhanced markdown renderer for AI chat messages.
 *
 * Features:
 *   - Step detection: numbered workflow steps wrapped in visual cards
 *   - Connection type badges: IMAGE, MODEL, CLIP etc. with ComfyUI colors
 *   - Code blocks with copy button + syntax-style highlighting
 *   - Enhanced headings with accent borders
 *   - Collapsible step sections
 *   - Node ID badges (#45, #68)
 *   - Callout-style blockquotes
 */

import { useState, useMemo, useCallback, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Check, Copy, ChevronDown, ChevronRight, Layers, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ---- ComfyUI type color map (matches ComfyNode.tsx) -------------------------

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MODEL:        { bg: 'rgba(179,157,219,0.15)', text: '#b39ddb', border: 'rgba(179,157,219,0.3)' },
  CLIP:         { bg: 'rgba(255,213,79,0.15)',  text: '#ffd54f', border: 'rgba(255,213,79,0.3)' },
  VAE:          { bg: 'rgba(239,83,80,0.15)',   text: '#ef5350', border: 'rgba(239,83,80,0.3)' },
  CONDITIONING: { bg: 'rgba(255,167,38,0.15)',  text: '#ffa726', border: 'rgba(255,167,38,0.3)' },
  LATENT:       { bg: 'rgba(255,128,171,0.15)', text: '#ff80ab', border: 'rgba(255,128,171,0.3)' },
  IMAGE:        { bg: 'rgba(100,181,246,0.15)', text: '#64b5f6', border: 'rgba(100,181,246,0.3)' },
  MASK:         { bg: 'rgba(129,199,132,0.15)', text: '#81c784', border: 'rgba(129,199,132,0.3)' },
  CONTROL_NET:  { bg: 'rgba(77,208,225,0.15)',  text: '#4dd0e1', border: 'rgba(77,208,225,0.3)' },
  UPSCALE_MODEL:{ bg: 'rgba(161,136,127,0.15)', text: '#a1887f', border: 'rgba(161,136,127,0.3)' },
  CLIP_VISION:  { bg: 'rgba(206,147,216,0.15)', text: '#ce93d8', border: 'rgba(206,147,216,0.3)' },
  IPADAPTER:    { bg: 'rgba(128,203,196,0.15)', text: '#80cbc4', border: 'rgba(128,203,196,0.3)' },
  FLOAT:        { bg: 'rgba(144,164,174,0.12)', text: '#90a4ae', border: 'rgba(144,164,174,0.25)' },
  INT:          { bg: 'rgba(144,164,174,0.12)', text: '#90a4ae', border: 'rgba(144,164,174,0.25)' },
  STRING:       { bg: 'rgba(144,164,174,0.12)', text: '#a0a0a0', border: 'rgba(144,164,174,0.25)' },
};

/** Try to detect known ComfyUI types in text and return color info */
function getTypeStyle(typeName: string) {
  const upper = typeName.toUpperCase().replace(/\s+/g, '_');
  return TYPE_COLORS[upper] || null;
}

// ---- Step/Section parser ----------------------------------------------------

interface ParsedSection {
  type: 'intro' | 'step' | 'section';
  stepNumber?: number;
  title?: string;
  content: string;
}

/**
 * Parse markdown into sections:
 * Detects patterns like "1)", "1.", "**1.", "**Step 1:", "## 1." at line start
 */
function parseSections(content: string): ParsedSection[] {
  const lines = content.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let accum: string[] = [];

  // Patterns that indicate a new numbered step
  // Match: "1)", "1.", "**1.", "**1)", "**Step 1:", "## 1.", "### 1."
  const stepPattern = /^(?:#{1,4}\s+)?(?:\*\*)?(?:Step\s+)?(\d+)[).:\s]/i;

  const flushAccum = () => {
    if (accum.length > 0) {
      const text = accum.join('\n').trim();
      if (text) {
        if (currentSection) {
          currentSection.content = text;
          sections.push(currentSection);
        } else {
          sections.push({ type: 'intro', content: text });
        }
      }
      accum = [];
      currentSection = null;
    }
  };

  for (const line of lines) {
    const stepMatch = line.match(stepPattern);
    if (stepMatch) {
      flushAccum();
      const stepNum = parseInt(stepMatch[1], 10);
      // Extract title: everything after the step number pattern
      const titleText = line
        .replace(stepPattern, '')
        .replace(/^\s*[-—:]\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/, '')
        .trim();
      currentSection = {
        type: 'step',
        stepNumber: stepNum,
        title: titleText || undefined,
        content: '',
      };
      // The first line is the title, skip it from content
      accum = [];
    } else {
      accum.push(line);
    }
  }
  flushAccum();

  return sections;
}

/** Check if content has enough numbered steps to warrant card view */
function hasSignificantSteps(sections: ParsedSection[]): boolean {
  const stepCount = sections.filter(s => s.type === 'step').length;
  return stepCount >= 2;
}

// ---- Connection type badge inline replacement --------------------------------

/** Replace (TYPE) patterns with badge markers for post-processing */
const KNOWN_TYPES = [
  'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE', 'MASK',
  'CONTROL_NET', 'UPSCALE_MODEL', 'CLIP_VISION', 'IPADAPTER',
  'FLOAT', 'INT', 'STRING',
];

const TYPE_BADGE_RE = new RegExp(
  `\\((${KNOWN_TYPES.join('|')})\\)`,
  'g',
);

function TypeBadge({ typeName }: { typeName: string }) {
  const style = getTypeStyle(typeName);
  if (!style) return <span>({typeName})</span>;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0 mx-0.5 rounded text-[10px] align-middle"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {typeName}
    </span>
  );
}

/** Process inline text to replace (TYPE) patterns with React elements */
function processInlineTypes(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TYPE_BADGE_RE.source, 'g');

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<TypeBadge key={`type-${match.index}`} typeName={match[1]} />);
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/** Also detect node ID references like #45, node 45, Node #45 */
const NODE_ID_RE = /(?:#(\d{1,4})(?!\d)|node\s+#?(\d{1,4}))/gi;

function processNodeIds(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(NODE_ID_RE.source, 'gi');

  while ((match = re.exec(text)) !== null) {
    const nodeId = match[1] || match[2];
    // Don't match if it's inside a larger word/number context
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={`node-${match.index}`}
        className="inline-flex items-center px-1.5 py-0 mx-0.5 rounded text-[10px] bg-surface-300/50 text-content-primary border border-border align-middle"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
        title={`Node #${nodeId}`}
      >
        #{nodeId}
      </span>,
    );
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 1 ? parts : [text];
}

/** Combined inline processing: types first, then node IDs within text segments */
function processInlineContent(text: string): ReactNode[] {
  const typeProcessed = processInlineTypes(text);
  const result: ReactNode[] = [];

  for (const part of typeProcessed) {
    if (typeof part === 'string') {
      result.push(...processNodeIds(part));
    } else {
      result.push(part);
    }
  }

  return result;
}

// ---- Copy button for code blocks --------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-200/80 hover:bg-accent text-content-secondary hover:text-content-primary transition-all opacity-0 group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-state-success" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ---- Step card wrapper -------------------------------------------------------

interface StepCardProps {
  stepNumber: number;
  title?: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
}

function StepCard({ stepNumber, title, children, defaultCollapsed = false }: StepCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="my-2 rounded-lg border border-border bg-surface-300/50 overflow-hidden">
      {/* Step header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/40 transition-colors group"
      >
        {/* Step number badge */}
        <span className="shrink-0 w-6 h-6 rounded-full bg-accent-muted border border-accent/30 text-accent-text flex items-center justify-center text-[11px]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {stepNumber}
        </span>
        {/* Title */}
        {title && (
          <span className="flex-1 text-[13px] text-content-primary truncate">
            {processInlineContent(title)}
          </span>
        )}
        {/* Collapse toggle */}
        <span className="shrink-0 text-content-muted group-hover:text-content-secondary transition-colors">
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {/* Step content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-border-subtle">
              <div className="pl-9">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Intro/Summary card ------------------------------------------------------

function IntroCard({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 rounded-lg border border-accent/15 bg-accent-muted px-4 py-3">
      {children}
    </div>
  );
}

// ---- Build enhanced markdown components -------------------------------------

const DOWNLOAD_BADGE_STYLES: Record<string, { emoji: string; label: string; className: string }> = {
  huggingface: {
    emoji: '🤗',
    label: 'HuggingFace',
    className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border border-yellow-500/30 text-yellow-300 bg-yellow-500/5 hover:bg-yellow-500/15 transition-colors',
  },
  civitai: {
    emoji: '🟢',
    label: 'CivitAI',
    className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border border-state-info/30 text-state-info bg-state-info-muted hover:bg-state-info-muted transition-colors',
  },
  github: {
    emoji: '⬛',
    label: 'GitHub',
    className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border border-border text-content-primary bg-surface-300/50 hover:bg-accent transition-colors',
  },
};

function detectDownloadSource(href?: string): 'huggingface' | 'civitai' | 'github' | null {
  if (!href) return null;
  if (href.includes('huggingface.co')) return 'huggingface';
  if (href.includes('civitai.com')) return 'civitai';
  if (href.includes('github.com')) return 'github';
  return null;
}

function buildMarkdownComponents(
  extraComponents: Components,
): Components {
  const externalAnchor = extraComponents.a as ((props: any) => ReactNode) | undefined;

  return {
    ...extraComponents,

    // Enhanced headings
    h1: ({ children, ...props }: any) => (
      <h1
        className="text-[15px] text-content-primary mt-4 mb-2 pb-1.5 border-b border-border-strong/50 flex items-center gap-2"
        {...props}
      >
        <span className="w-1 h-5 rounded-full bg-accent shrink-0" />
        {children}
      </h1>
    ),

    h2: ({ children, ...props }: any) => (
      <h2
        className="text-[13px] text-content-primary mt-4 mb-1.5 flex items-center gap-2"
        {...props}
      >
        <span className="w-1 h-4 rounded-full bg-accent/60 shrink-0" />
        {children}
      </h2>
    ),

    h3: ({ children, ...props }: any) => (
      <h3
        className="text-[12px] text-content-primary mt-3 mb-1 flex items-center gap-1.5"
        {...props}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent/50 shrink-0" />
        {children}
      </h3>
    ),

    h4: ({ children, ...props }: any) => (
      <h4
        className="text-[12px] text-content-secondary mt-2 mb-1"
        {...props}
      >
        {children}
      </h4>
    ),

    // Enhanced paragraph with inline processing
    p: ({ children, ...props }: any) => {
      const processed = processChildNodes(children);
      return (
        <p className="my-1.5 text-[12.5px] text-content-primary leading-relaxed" {...props}>
          {processed}
        </p>
      );
    },

    // Enhanced strong
    strong: ({ children, ...props }: any) => (
      <strong className="text-content-primary" {...props}>
        {children}
      </strong>
    ),

    // Enhanced emphasis
    em: ({ children, ...props }: any) => (
      <em className="text-content-secondary not-italic text-[12px]" {...props}>
        {children}
      </em>
    ),

    // Enhanced inline code — detect type names
    code: ({ children, className, ...props }: any) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        // Block code handled by pre wrapper
        return <code className={className} {...props}>{children}</code>;
      }
      const text = String(children).trim();
      const typeStyle = getTypeStyle(text);
      if (typeStyle) {
        return (
          <code
            className="inline-flex items-center px-1.5 py-0 mx-0.5 rounded text-[10.5px] align-middle"
            style={{
              backgroundColor: typeStyle.bg,
              color: typeStyle.text,
              border: `1px solid ${typeStyle.border}`,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {text}
          </code>
        );
      }
      return (
        <code
          className="inline px-1.5 py-0.5 mx-0.5 rounded text-[11px] bg-accent text-primary border border-border align-middle"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          {...props}
        >
          {children}
        </code>
      );
    },

    // Enhanced code blocks with copy button
    pre: ({ children, ...props }: any) => {
      const codeText = extractTextFromChildren(children);
      return (
        <div className="relative group my-2">
          <pre
            className="rounded-lg bg-surface-100 border border-border p-3 overflow-x-auto text-[11px] text-content-primary"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            {...props}
          >
            {children}
          </pre>
          <CopyButton text={codeText} />
        </div>
      );
    },

    // Enhanced blockquote — styled as info callout
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className="my-2 rounded-lg border-l-2 border-accent/50 bg-accent-muted px-3 py-2 text-[12px] text-content-secondary"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Enhanced unordered list
    ul: ({ children, ...props }: any) => (
      <ul className="my-1.5 space-y-1 ml-0.5" {...props}>
        {children}
      </ul>
    ),

    // Enhanced ordered list
    ol: ({ children, ...props }: any) => (
      <ol className="my-1.5 space-y-1 ml-0.5 list-none counter-reset-[step]" style={{ counterReset: 'step' }} {...props}>
        {children}
      </ol>
    ),

    // Enhanced list item
    li: ({ children, ordered, ...props }: any) => (
      <li
        className="flex gap-2 text-[12.5px] text-content-primary leading-relaxed"
        {...props}
      >
        <span className="shrink-0 mt-[7px] w-1 h-1 rounded-full bg-content-muted" />
        <span className="flex-1">{processChildNodes(children)}</span>
      </li>
    ),

    // Enhanced table
    table: ({ children, ...props }: any) => (
      <div className="my-2 rounded-lg border border-border-strong/50 overflow-hidden overflow-x-auto">
        <table className="w-full text-[11px]" {...props}>
          {children}
        </table>
      </div>
    ),

    thead: ({ children, ...props }: any) => (
      <thead className="bg-surface-secondary/50" {...props}>
        {children}
      </thead>
    ),

    th: ({ children, ...props }: any) => (
      <th className="px-3 py-1.5 text-left text-content-secondary border-b border-border-strong/50" {...props}>
        {children}
      </th>
    ),

    td: ({ children, ...props }: any) => (
      <td className="px-3 py-1.5 text-content-primary border-b border-border-subtle" {...props}>
        {children}
      </td>
    ),

    // Enhanced horizontal rule
    hr: (props: any) => (
      <hr className="my-3 border-border-strong/40" {...props} />
    ),

    // Links
    a: ({ href, children, ...props }: any) => {
      if (href?.startsWith('pack://') && externalAnchor) {
        return externalAnchor({ href, children, ...props });
      }

      const source = detectDownloadSource(href);
      if (source) {
        const badge = DOWNLOAD_BADGE_STYLES[source];
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={badge.className}
            {...props}
          >
            <span>{badge.emoji}</span>
            <span>{children || badge.label}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
          </a>
        );
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-text hover:text-accent-text underline underline-offset-2 decoration-accent/30"
          {...props}
        >
          {children}
        </a>
      );
    },
  };
}

// ---- Helpers ----------------------------------------------------------------

/** Extract raw text from React children (for code blocks copy) */
function extractTextFromChildren(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as any).props?.children || '');
  }
  return String(children ?? '');
}

/** Process child nodes to apply inline type/node-id detection on text segments */
function processChildNodes(children: ReactNode): ReactNode {
  if (typeof children === 'string') {
    const processed = processInlineContent(children);
    return processed.length === 1 ? processed[0] : <>{processed}</>;
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        const processed = processInlineContent(child);
        return processed.length === 1 ? (
          <span key={i}>{processed[0]}</span>
        ) : (
          <span key={i}>{processed}</span>
        );
      }
      return child;
    });
  }
  return children;
}

// ---- Main RichMessage component ---------------------------------------------

interface RichMessageProps {
  content: string;
  /** Extra ReactMarkdown components (e.g. pack:// link handler from ChatPanel) */
  extraComponents?: Components;
  /** URL transform function (e.g. for pack:// protocol) */
  urlTransform?: (url: string) => string;
  /** Whether this is a streaming message (skip step detection for perf) */
  isStreaming?: boolean;
}

export function RichMessage({
  content,
  extraComponents = {},
  urlTransform,
  isStreaming = false,
}: RichMessageProps) {
  // Parse sections (skip for streaming messages for performance)
  const sections = useMemo(
    () => (isStreaming ? [] : parseSections(content)),
    [content, isStreaming],
  );

  const useStepView = !isStreaming && hasSignificantSteps(sections);
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Build enhanced markdown components, merging with external ones
  const mdComponents = useMemo(
    () => buildMarkdownComponents(extraComponents),
    [extraComponents],
  );

  // Simple view — enhanced markdown only (no step cards)
  if (!useStepView) {
    return (
      <div className="rich-message prose-reset">
        <ReactMarkdown components={mdComponents} urlTransform={urlTransform}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // Step view — sections wrapped in cards
  return (
    <div className="rich-message prose-reset">
      {/* Collapse all toggle when there are many steps */}
      {sections.filter(s => s.type === 'step').length >= 4 && (
        <div className="flex justify-end mb-1">
          <button
            onClick={() => setAllCollapsed(!allCollapsed)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-content-muted hover:text-content-primary hover:bg-accent transition-colors"
          >
            <Layers className="w-3 h-3" />
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        </div>
      )}

      {sections.map((section, idx) => {
        if (section.type === 'intro') {
          return (
            <IntroCard key={`intro-${idx}`}>
              <ReactMarkdown components={mdComponents} urlTransform={urlTransform}>
                {section.content}
              </ReactMarkdown>
            </IntroCard>
          );
        }

        if (section.type === 'step') {
          return (
            <StepCardControlled
              key={`step-${section.stepNumber}-${idx}`}
              stepNumber={section.stepNumber!}
              title={section.title}
              collapsed={allCollapsed}
            >
              <ReactMarkdown components={mdComponents} urlTransform={urlTransform}>
                {section.content}
              </ReactMarkdown>
            </StepCardControlled>
          );
        }

        // section type
        return (
          <div key={`section-${idx}`} className="my-2">
            <ReactMarkdown components={mdComponents} urlTransform={urlTransform}>
              {section.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

// ---- Controlled StepCard (responds to parent allCollapsed) -------------------

interface StepCardControlledProps {
  stepNumber: number;
  title?: string;
  children: ReactNode;
  collapsed: boolean;
}

function StepCardControlled({ stepNumber, title, children, collapsed: parentCollapsed }: StepCardControlledProps) {
  const [localOverride, setLocalOverride] = useState<boolean | null>(null);
  const isCollapsed = localOverride !== null ? localOverride : parentCollapsed;

  // Reset local override when parent changes
  const [prevParent, setPrevParent] = useState(parentCollapsed);
  if (parentCollapsed !== prevParent) {
    setPrevParent(parentCollapsed);
    setLocalOverride(null);
  }

  return (
    <div className="my-2 rounded-lg border border-border bg-surface-300/50 overflow-hidden">
      <button
        onClick={() => setLocalOverride(!isCollapsed)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/40 transition-colors group"
      >
        <span
          className="shrink-0 w-6 h-6 rounded-full bg-accent-muted border border-accent/30 text-accent-text flex items-center justify-center text-[11px]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {stepNumber}
        </span>
        {title && (
          <span className="flex-1 text-[13px] text-content-primary truncate">
            {processInlineContent(title)}
          </span>
        )}
        <span className="shrink-0 text-content-muted group-hover:text-content-secondary transition-colors">
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-border-subtle">
              <div className="pl-9">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

