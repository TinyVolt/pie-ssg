import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { buildFeatures, FEATURE_FIELDS } from './features/build';
import type { PageTags } from './features/tags/pages';
import { parseFrontmatter } from './frontmatter';
import type { Page } from './pages';
import { renderMarkdown } from './render';
import { APP_DIR } from '../appDir';
import { parseSite } from '../site/vitePlugin';

/**
 * Turns each `pages/**\/*.md` into a module whose default export is a `Page`, at build time,
 * so the browser gets finished HTML and never runs the markdown tools.
 * With `?tags`, the module's default export is a `PageTags` instead, so the tag pages don't load every page's HTML.
 * Bad frontmatter, or a feature's bad value, fails the build; in dev it shows Vite's error screen.
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
      const [filePath, query] = id.split('?');
      const file = path.relative(root, filePath);
      if (!file.startsWith(`pages${path.sep}`) || !file.endsWith('.md')) return;
      const { frontmatter, raw, body } = parseFrontmatter(file, markdown);

      if (new URLSearchParams(query).has('tags')) {
        const { title, description } = frontmatter;
        const page: PageTags = { title, description, tags: FEATURE_FIELDS.tags.parse(raw.tags ?? '') };
        return { code: `export default ${JSON.stringify(page)};`, map: null };
      }

      // Features read `site.yml` for the keys a page leaves out, so editing it rebuilds every page.
      const siteFile = path.join(root, 'site.yml');
      this.addWatchFile(siteFile);
      const site = parseSite('site.yml', fs.readFileSync(siteFile, 'utf8'));

      const readFile = (from: string, mdPath: string) => {
        const target = path.resolve(root, path.dirname(from), mdPath);
        const relative = path.relative(root, target);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
          throw new Error(`must be inside the project, got ${JSON.stringify(mdPath)}`);
        }
        const shown = relative.split(path.sep).join('/');
        if (!fs.existsSync(target)) throw new Error(`file ${shown} does not exist`);
        this.addWatchFile(target);
        return parseFrontmatter(shown, fs.readFileSync(target, 'utf8')).body;
      };

      const { data, extensions } = buildFeatures(file, raw, site, readFile);
      const page: Page = { frontmatter, html: renderMarkdown(body, extensions), features: data };
      return { code: `export default ${JSON.stringify(page)};`, map: null };
    },
  };
}

// The route that serves markdown pages. Every other route wins over it.
const PAGE_ROUTE = '[...slug].tsx';

/**
 * Fails the build when a `pages/**\/*.md` has the same URL as a route in `src/routes/`,
 * e.g. `pages/about.md` and `src/routes/about.tsx`, or `pages/blog/a.md` and `src/routes/blog/[id].tsx`.
 * Without this, the route wins and the page can't be reached.
 */
export function checkPageRoutes(): Plugin {
  let root = '';
  let checked = false;

  return {
    name: 'check-page-routes',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    // Runs once per build environment (client, ssr, ...); one check is enough.
    buildStart() {
      if (checked) return;
      checked = true;
      const routes = listFiles(path.join(APP_DIR, 'routes'))
        .filter(file => /\.(tsx|ts|jsx|js)$/.test(file) && file !== PAGE_ROUTE)
        .map(file => ({ file, pattern: routePattern(file) }));
      const clashes: string[] = [];
      // A file whose name starts with `_` has no URL.
      const pages = listFiles(path.join(root, 'pages')).filter(file => file.endsWith('.md') && !path.posix.basename(file).startsWith('_'));
      for (const file of pages) {
        const url = file.replace(/\.md$/, '').split('/');
        for (const route of routes) {
          if (matches(route.pattern, url)) {
            clashes.push(`pages/${file} (/${url.join('/')}) clashes with src/routes/${route.file}`);
          }
        }
      }
      if (clashes.length) this.error(`Markdown pages clash with routes:\n${clashes.join('\n')}`);
    },
  };
}

/** Every file under `dir`, as a path relative to it with `/` separators. */
function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
}

/** `blog/(group)/[id]/index.tsx` -> `['blog', '[id]']`, following SolidStart's file routes. */
function routePattern(file: string): string[] {
  const segments = file.replace(/\.(tsx|ts|jsx|js)$/, '').split('/').filter(s => !/^\(.*\)$/.test(s));
  if (segments.at(-1) === 'index') segments.pop();
  return segments;
}

/** Whether a route pattern matches a URL, both as segments. */
function matches(pattern: string[], url: string[]): boolean {
  const [head, ...rest] = pattern;
  if (head === undefined) return url.length === 0;
  if (/^\[\[?\.\.\./.test(head)) return true; // [...x] or [[...x]]: matches the rest
  if (head.startsWith('[[')) return matches(rest, url) || (url.length > 0 && matches(rest, url.slice(1)));
  if (head.startsWith('[')) return url.length > 0 && matches(rest, url.slice(1));
  return url[0] === head && matches(rest, url.slice(1));
}
