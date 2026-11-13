import React from 'react';
import DOMPurify from 'dompurify';

/**
 * SafeMarkdown: Safely parses basic Markdown formatting (bold, italics, code)
 * while strictly preventing XSS by stripping all executable HTML, scripts,
 * image error handlers, and dangerous attributes via DOMPurify.
 */
export default function SafeMarkdown({ content = '', className = '' }) {
  if (!content) return null;

  const lines = String(content).split('\n');

  return (
    <div className={`whitespace-pre-wrap font-sans ${className}`}>
      {lines.map((line, idx) => {
        // Convert markdown bold **text** -> <strong>text</strong>
        let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Convert markdown code `code` -> <code>code</code>
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-slate-200 dark:bg-slate-750 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>');

        // Strictly sanitize: Only allow harmless formatting tags, remove all attributes/scripts/event handlers
        const cleanHtml = DOMPurify.sanitize(formatted, {
          ALLOWED_TAGS: ['strong', 'b', 'em', 'i', 'code', 'span'],
          ALLOWED_ATTR: ['class']
        });

        return (
          <p
            key={idx}
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
            className="min-h-[1rem]"
          />
        );
      })}
    </div>
  );
}

