import type { FeatureData } from './features/build';
import type { Frontmatter } from './frontmatter';

/** One `pages/**\/*.md`, as `vitePlugin.ts` turns it into a module at build time. */
export interface Page {
  frontmatter: Frontmatter;
  html: string;
  features: FeatureData;
}

// Not eager: each page is its own file, downloaded only when that page is opened.
// A file whose name starts with `_` is not a page; it can still be used by a feature, e.g. as a sidebar.
const loaders = import.meta.glob<Page>(['/pages/**/*.md', '!/pages/**/_*.md'], { import: 'default' });

// Slug -> loader. `/pages/a/b.md` has the slug `a/b`.
const bySlug = new Map(
  Object.entries(loaders).map(([path, load]) => [path.replace(/^\/pages\//, '').replace(/\.md$/, ''), load]),
);

export const slugs = [...bySlug.keys()];

/** `null` when no page has this slug. */
export async function loadPage(slug: string): Promise<Page | null> {
  const load = bySlug.get(slug);
  return load ? load() : null;
}
