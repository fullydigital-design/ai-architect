import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText, Copy, Check, Download } from 'lucide-react';
import { HANDLE_COLORS, DataType } from '../types';

// Rich text formatter component
function FormattedText({ text }: { text: string }) {
  const formatText = (input: string) => {
    const lines = input.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, lineIndex) => {
      // Skip empty lines but add spacing
      if (line.trim() === '') {
        elements.push(<div key={`spacer-${lineIndex}`} className="h-2" />);
        return;
      }

      // Headers with ** (bold)
      if (line.includes('**')) {
        const parts = line.split('**');
        const formatted = parts.map((part, i) => {
          if (i % 2 === 1) {
            // This is between ** markers - make it bold
            return <strong key={i} className="font-black text-gray-900">{part}</strong>;
          }
          return <span key={i}>{part}</span>;
        });
        
        elements.push(
          <div key={lineIndex} className="mb-3">
            {formatted}
          </div>
        );
        return;
      }

      // Bullet points (lines starting with -)
      if (line.trim().startsWith('-')) {
        const content = line.trim().substring(1).trim();
        elements.push(
          <div key={lineIndex} className="flex gap-2 mb-2 ml-4">
            <span className="text-purple-600 font-black">•</span>
            <span className="flex-1">{content}</span>
          </div>
        );
        return;
      }

      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        elements.push(
          <div key={lineIndex} className="flex gap-2 mb-2 ml-4">
            <span className="text-purple-600 font-black">{numberedMatch[1]}.</span>
            <span className="flex-1">{numberedMatch[2]}</span>
          </div>
        );
        return;
      }

      // Section headers with emojis (lines starting with emoji)
      const emojiMatch = line.match(/^([🎯💬🎬🎨🎵💡📋✨🌿🚀⚡🔥💎📱🎪🌟💫⭐🎁🎉🎊]+)\s+(.+)/);
      if (emojiMatch) {
        elements.push(
          <div key={lineIndex} className="mb-3 mt-4">
            <span className="text-xl mr-2">{emojiMatch[1]}</span>
            <span className="font-black text-gray-900">{emojiMatch[2]}</span>
          </div>
        );
        return;
      }

      // Regular text
      elements.push(
        <div key={lineIndex} className="mb-2 leading-relaxed">
          {line}
        </div>
      );
    });

    return elements;
  };

  return <div className="text-sm text-content-faint">{formatText(text)}</div>;
}

function TextDisplayNodeComponent({ id, data, selected }: NodeProps) {
  const [copied, setCopied] = useState(false);
  const resultText = data.result || '';

  const handleCopy = () => {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (resultText) {
      const blob = new Blob([resultText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gemini-output.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className={`rounded-xl shadow-lg transition-all bg-white ${
        selected ? 'ring-4 ring-purple-400 shadow-2xl' : 'shadow-md hover:shadow-xl'
      }`}
      style={{ width: '420px' }}
    >
      {/* Header */}
      <div className="px-4 py-3 rounded-t-xl bg-gradient-to-br from-indigo-500 to-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-xs font-black text-white">TEXT OUTPUT</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="nodrag p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="nodrag p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Download as text file"
            >
              <Download className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 bg-white rounded-b-xl border-2 border-gray-200">
        {resultText ? (
          <div className="space-y-3">
            {/* Result Display with Rich Formatting */}
            <div className="max-h-[500px] overflow-y-auto">
              <div className="p-4 bg-gradient-to-br from-gray-50 to-purple-50 rounded-lg border border-purple-100">
                <FormattedText text={resultText} />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-content-faint">
                {resultText.split(' ').filter(w => w.length > 0).length} words
              </span>
              <span className="font-medium text-content-muted">
                {resultText.length} characters
              </span>
            </div>

            {/* Copy Confirmation */}
            {copied && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-1">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-green-700">Copied to clipboard!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 text-content-primary mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-900 mb-1">No Output Yet</p>
            <p className="text-xs text-content-muted">
              Connect a text source and run the workflow
            </p>
          </div>
        )}
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="text-input"
        style={{
          top: '50%',
          background: HANDLE_COLORS[DataType.TEXT],
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
        className="transition-transform hover:scale-125"
      />

      {/* Provider badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black shadow-lg" style={{ fontSize: '9px' }}>
        OUTPUT
      </div>
    </div>
  );
}

export const TextDisplayNode = memo(TextDisplayNodeComponent);
