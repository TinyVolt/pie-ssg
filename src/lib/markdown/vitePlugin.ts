import path from 'node:path';
import type { Plugin } from 'vite';
import { parseFrontmatter } from './frontmatter';
import type { Page } from './pages';
import { renderMarkdown } from './render';

/**
 * Turns each `pages/**\/*.md` into a module whose default export is a `Page`, at build time,
 * so the browser gets finished HTML and never runs the markdown tools.
 * Bad frontmatter fails the build; in dev it shows Vite's error screen.
 */
export function markdownPages(): Plugin {
  let root = '';

  return {
    name: 'markdown-pages',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    transform(markdown, id) {
      const file = path.relative(root, id.split('?')[0]);
      if (!file.startsWith(`pages${path.sep}`) || !file.endsWith('.md')) return;
      const { frontmatter, body } = parseFrontmatter(file, markdown);
      const page: Page = { frontmatter, html: renderMarkdown(body) };
      return { code: `export default ${JSON.stringify(page)};`, map: null };
    },
  };
}
