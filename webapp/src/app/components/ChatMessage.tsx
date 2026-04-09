import React from 'react';

interface ChatMessageProps {
  text: string;
  role: 'user' | 'model';
}

export function ChatMessage({ text, role }: ChatMessageProps) {
  // Parse markdown-style formatting
  const parseText = (input: string) => {
    const elements: React.ReactNode[] = [];
    const lines = input.split('\n');
    let currentParagraph: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let listItems: string[] = [];
    let inList = false;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={elements.length} className="mb-3 last:mb-0 leading-relaxed">
            {parseInlineFormatting(currentParagraph.join('\n'))}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={elements.length} className="mb-3 space-y-1.5 ml-4">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span className="flex-1">{parseInlineFormatting(item)}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      // Code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <pre key={elements.length} className="mb-3 p-3 bg-surface-inset text-gray-100 rounded-lg overflow-x-auto text-xs font-mono">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // Start code block
          flushParagraph();
          flushList();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h3 key={elements.length} className="text-base font-bold text-gray-900 mb-2 mt-3 first:mt-0">
            {parseInlineFormatting(line.substring(4))}
          </h3>
        );
        return;
      }

      if (line.startsWith('## ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h2 key={elements.length} className="text-lg font-bold text-gray-900 mb-2 mt-4 first:mt-0">
            {parseInlineFormatting(line.substring(3))}
          </h2>
        );
        return;
      }

      if (line.startsWith('# ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h1 key={elements.length} className="text-xl font-bold text-gray-900 mb-3 mt-4 first:mt-0">
            {parseInlineFormatting(line.substring(2))}
          </h1>
        );
        return;
      }

      // Bullet lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        flushParagraph();
        inList = true;
        const content = line.trim().substring(2);
        listItems.push(content);
        return;
      }

      // Numbered lists
      if (/^\d+\.\s/.test(line.trim())) {
        flushParagraph();
        if (inList && listItems.length > 0) {
          flushList();
        }
        const content = line.trim().replace(/^\d+\.\s/, '');
        if (!inList) {
          inList = true;
        }
        listItems.push(content);
        return;
      }

      // Blockquote
      if (line.trim().startsWith('> ')) {
        flushParagraph();
        flushList();
        elements.push(
          <blockquote key={elements.length} className="border-l-4 border-blue-500 pl-4 py-2 mb-3 bg-blue-50 rounded-r-lg italic text-content-faint">
            {parseInlineFormatting(line.trim().substring(2))}
          </blockquote>
        );
        return;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        flushParagraph();
        flushList();
        elements.push(
          <hr key={elements.length} className="my-4 border-gray-300" />
        );
        return;
      }

      // Empty line - end paragraph
      if (line.trim() === '') {
        flushParagraph();
        flushList();
        return;
      }

      // Regular paragraph
      if (inList) {
        flushList();
      }
      currentParagraph.push(line);
    });

    // Flush remaining content
    flushParagraph();
    flushList();

    return elements.length > 0 ? elements : <span>{text}</span>;
  };

  // Parse inline formatting (bold, italic, code, links)
  const parseInlineFormatting = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
      if (boldMatch) {
        parts.push(
          <strong key={key++} className="font-bold text-gray-900">
            {boldMatch[2]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)(.+?)\1/);
      if (italicMatch) {
        parts.push(
          <em key={key++} className="italic text-gray-800">
            {italicMatch[2]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Inline code: `code`
      const codeMatch = remaining.match(/^`(.+?)`/);
      if (codeMatch) {
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 bg-gray-200 text-gray-900 rounded text-xs font-mono">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Links: [text](url)
      const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        parts.push(
          <a 
            key={key++} 
            href={linkMatch[2]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline font-medium"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Regular text
      const nextSpecial = remaining.search(/(\*\*|__|`|\*|_|\[)/);
      if (nextSpecial === -1) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      } else {
        parts.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>);
        remaining = remaining.slice(nextSpecial);
      }
    }

    return parts;
  };

  return (
    <div className={`text-gray-800 text-xs lg:text-sm ${role === 'model' ? 'select-text' : ''}`}>
      {parseText(text)}
    </div>
  );
}