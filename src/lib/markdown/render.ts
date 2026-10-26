import katex from 'katex';
import { Marked, Renderer, type MarkedExtension } from 'marked';
import { pythonLanguage } from '@codemirror/lang-python';
import { classHighlighter, highlightCode } from '@lezer/highlight';

function renderMath(formula: string, displayMode: boolean): string {
  return katex.renderToString(formula, { displayMode, throwOnError: false });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Python as HTML, with `tok-*` classes on each token. app.css colors them like the editor. */
function highlightPython(code: string): string {
  let html = '';
  highlightCode(
    code,
    pythonLanguage.parser.parse(code),
    classHighlighter,
    (text, classes) => {
      html += classes ? `<span class="${classes}">${escapeHtml(text)}</span>` : escapeHtml(text);
    },
    () => {
      html += '\n';
    },
  );
  return html;
}

const BASE: MarkedExtension = {
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
  renderer: {
    // ```python-editor collapsed: marked keeps only the first word, so mark the block for the editor here.
    // ```python: color each token here, at build time.
    code(token) {
      const [lang, ...flags] = (token.lang ?? '').split(/\s+/);
      if (lang === 'python') {
        const code = token.text.replace(/\n$/, '') + '\n';
        return `<pre><code class="language-python">${highlightPython(code)}</code></pre>\n`;
      }
      if (lang !== 'python-editor' || !flags.includes('collapsed')) return false;
      return new Renderer().code(token).replace('<code ', '<code data-collapsed ');
    },
  },
};

const marked = new Marked(BASE);

/** `extensions`: markdown syntax the page's features add. */
export function renderMarkdown(markdown: string, extensions: MarkedExtension[] = []): string {
  const parser = extensions.length === 0 ? marked : new Marked(BASE, ...extensions);
  return parser.parse(markdown) as string;
}
