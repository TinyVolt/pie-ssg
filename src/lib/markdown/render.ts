import katex from 'katex';
import { Marked } from 'marked';

function renderMath(formula: string, displayMode: boolean): string {
  return katex.renderToString(formula, { displayMode, throwOnError: false });
}

const marked = new Marked({
  extensions: [
    {
      // `$$…$$` that fills its own lines.
      name: 'mathblock',
      level: 'block',
      start(src) {
        const at = src.indexOf('\n$$');
        return at === -1 ? undefined : at + 1;
      },
      tokenizer(src) {
        const match = /^\$\$([^$]+)\$\$[ \t]*(?:\n|$)/.exec(src);
        if (!match) return undefined;
        return { type: 'mathblock', raw: match[0], formula: match[1].trim() };
      },
      renderer(token) {
        return `${renderMath(token.formula, true)}\n`;
      },
    },
    {
      // `$…$`, and `$$…$$` inside a line of text.
      name: 'math',
      level: 'inline',
      start(src) {
        const at = src.indexOf('$');
        return at === -1 ? undefined : at;
      },
      tokenizer(src) {
        const match = /^\$\$([^$]+)\$\$/.exec(src) ?? /^\$([^$]+)\$/.exec(src);
        if (!match) return undefined;
        return {
          type: 'math',
          raw: match[0],
          formula: match[1].trim(),
          displayMode: match[0].startsWith('$$'),
        };
      },
      renderer(token) {
        return renderMath(token.formula, token.displayMode);
      },
    },
  ],
});

export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown) as string;
}
