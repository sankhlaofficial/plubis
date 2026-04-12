/**
 * Zero-dependency markdown → JSX renderer.
 *
 * Handles the subset of markdown the generator script asks Claude to produce:
 *   - H1 (skipped — the page already renders the title from the article config)
 *   - H2 and H3
 *   - Paragraphs separated by blank lines
 *   - Unordered lists (`- item`)
 *   - Inline `**bold**`, `*italic*`, and `[link text](https://...)`
 *
 * Deliberately tiny so we don't need to add @mdx-js, gray-matter, remark, or
 * react-markdown. Any markdown feature outside this subset will render as
 * literal text — the generator prompt is pinned to this subset.
 */

import React from 'react';

export function renderMarkdown(md: string): React.ReactElement[] {
  const lines = md.split('\n');
  const blocks: React.ReactElement[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // H1 — skip (the page already renders the title from the config).
    if (line.startsWith('# ')) {
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      blocks.push(
        <h2
          key={key++}
          className="font-display text-2xl sm:text-3xl font-bold text-ink mt-12 mb-4"
        >
          {renderInline(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      blocks.push(
        <h3
          key={key++}
          className="font-display text-xl font-semibold text-ink mt-8 mb-3"
        >
          {renderInline(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }

    // Unordered list — collect consecutive `- ` lines
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith('- ') || lines[i].startsWith('* '))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          className="list-disc pl-6 my-5 space-y-2 text-ink-soft leading-relaxed"
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph — gather consecutive non-blank, non-block lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(
        <p
          key={key++}
          className="my-5 leading-relaxed text-ink-soft text-base sm:text-lg"
        >
          {renderInline(paraLines.join(' '))}
        </p>,
      );
    }
  }

  return blocks;
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith('#') ||
    line.startsWith('- ') ||
    line.startsWith('* ') ||
    line.startsWith('> ')
  );
}

/**
 * Inline renderer — walks the text with a single regex that matches bold,
 * italic, and links in one pass. Anything not matched becomes a literal
 * text node.
 */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*')) {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        const href = m[2];
        const isExternal = /^https?:\/\//.test(href);
        parts.push(
          <a
            key={key++}
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="text-ink underline decoration-outline/40 underline-offset-4 hover:decoration-outline"
          >
            {m[1]}
          </a>,
        );
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
