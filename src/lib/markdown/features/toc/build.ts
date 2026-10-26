import type { MarkedExtension } from 'marked';
import { boolean } from '../../frontmatter';
import type { FeatureBuild } from '../build';

/** Heading levels listed: `##` and `###`. */
const LEVELS = [2, 3];

interface Entry {
  depth: number;
  id: string;
  /** The heading's text as HTML, e.g. with its math rendered. */
  html: string;
}

/** `The $\nabla$ operator` -> `the-nabla-operator`. */
function slug(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
}

/** The entries as a list. Each `###` is nested under the `##` before it; a `###` before any `##` stands on its own. */
function tocHtml(entries: Entry[]): string {
  const groups: { entry: Entry; children: Entry[] }[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (entry.depth === 3 && last?.entry.depth === 2) last.children.push(entry);
    else groups.push({ entry, children: [] });
  }
  const link = (e: Entry) => `<a href="#${e.id}">${e.html}</a>`;
  const items = groups.map(({ entry, children }) => {
    const sublist = children.length === 0 ? '' : `<ul>${children.map(c => `<li>${link(c)}</li>`).join('')}</ul>`;
    return `<li>${link(entry)}${sublist}</li>`;
  });
  return `<nav class="toc"><ul>${items.join('')}</ul></nav>\n`;
}

/**
 * `toc: true`: a table of contents of the page's `##` and `###` headings, after its leading `#` title,
 * or at the very start if the page doesn't begin with one. Every heading gets an `id` to link to.
 * No list when the page has no such heading.
 */
export const toc: FeatureBuild<boolean, true> = {
  field: boolean(false),
  build: on => (on ? true : undefined),
  // The list is made while the page renders, from the headings as they're rendered, so each entry's text
  // and `id` match its heading's.
  markdown() {
    const entries: Entry[] = [];
    const used = new Map<string, number>();
    return {
      renderer: {
        heading(token) {
          const base = slug(token.text);
          const count = (used.get(base) ?? 0) + 1;
          used.set(base, count);
          const id = count === 1 ? base : `${base}-${count}`;
          const html = this.parser.parseInline(token.tokens);
          if (LEVELS.includes(token.depth)) entries.push({ depth: token.depth, id, html });
          return `<h${token.depth} id="${id}">${html}</h${token.depth}>\n`;
        },
      },
      hooks: {
        postprocess(html) {
          if (entries.length === 0) return html;
          const title = /^\s*<h1[\s>][\s\S]*?<\/h1>\n?/.exec(html);
          const at = title ? title[0].length : 0;
          return html.slice(0, at) + tocHtml(entries) + html.slice(at);
        },
      },
    } satisfies MarkedExtension;
  },
};
