import { Lexer, type MarkedExtension } from 'marked';
import { markdownFile } from '../../frontmatter';
import { renderInline, renderMarkdown } from '../../render';
import type { FeatureBuild } from '../build';

interface Term {
  /** The `id` of its entry in the page's glossary, e.g. `term-3`. */
  id: string;
  /** Its heading as HTML, e.g. with its math rendered. */
  name: string;
  /** Its definition as HTML. */
  html: string;
}

/** Matching ignores case. */
const key = (name: string) => name.trim().toLowerCase();

/** The section's title when the glossary file has no `#` heading. */
const DEFAULT_TITLE = 'Glossary';

/**
 * The glossary file `file`. `title`: its `#` heading, as HTML. `terms`: by `key`, in the file's order.
 * Each `##` heading is a term, and the text up to the next one is its definition.
 * Other text before the first `##` is ignored.
 */
function parseGlossary(file: string, markdown: string): { title: string; terms: Map<string, Term> } {
  let title = DEFAULT_TITLE;
  const sections: { name: string; body: string }[] = [];
  for (const token of Lexer.lex(markdown)) {
    if (token.type === 'heading' && token.depth === 2) sections.push({ name: token.text, body: '' });
    else if (sections.length > 0) sections[sections.length - 1].body += token.raw;
    else if (token.type === 'heading' && token.depth === 1) title = renderInline(token.text);
  }
  const terms = new Map<string, Term>();
  sections.forEach(({ name, body }, i) => {
    if (terms.has(key(name))) throw new Error(`file ${file} has the term ${JSON.stringify(name)} twice`);
    terms.set(key(name), { id: `term-${i + 1}`, name: renderInline(name), html: renderMarkdown(body) });
  });
  return { title, terms };
}

/** The page's glossary, collapsed: the terms it uses, in the glossary file's order. */
function glossaryHtml(title: string, terms: Term[]): string {
  const entries = terms.map(t => `<dt id="${t.id}">${t.name}</dt><dd>${t.html}</dd>`).join('');
  return `<details class="glossary"><summary>${title}</summary><dl>${entries}</dl></details>\n`;
}

/**
 * `glossary: _terms.md`: `[[term]]` and `[[shown|term]]` in the page become terms with a popup (see `View.tsx`),
 * and the page ends with a collapsed glossary of the terms it uses. A term missing from the file fails the build.
 */
export const glossary: FeatureBuild<string, true> = {
  field: markdownFile(),
  build: file => (file === '' || file === 'none' ? undefined : true),
  markdown(file, ctx) {
    const { title, terms } = parseGlossary(file, ctx.readFile(file));
    const used = new Set<Term>();
    return {
      extensions: [
        {
          name: 'term',
          level: 'inline',
          start(src) {
            const at = src.indexOf('[[');
            return at === -1 ? undefined : at;
          },
          tokenizer(src) {
            const match = /^\[\[([^[\]|]+)(?:\|([^[\]|]+))?\]\]/.exec(src);
            if (!match) return undefined;
            const [raw, shown, name = shown] = match;
            const term = terms.get(key(name));
            if (!term) throw new Error(`[[${name}]]: ${file} has no such term`);
            used.add(term);
            return { type: 'term', raw, term, tokens: this.lexer.inlineTokens(shown) };
          },
          renderer(token) {
            return `<span class="term" data-term="${token.term.id}">${this.parser.parseInline(token.tokens!)}</span>`;
          },
        },
      ],
      hooks: {
        postprocess(html) {
          if (used.size === 0) return html;
          return html + glossaryHtml(title, [...terms.values()].filter(t => used.has(t)));
        },
      },
    } satisfies MarkedExtension;
  },
};
