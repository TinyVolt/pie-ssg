import { slugOf } from '../../pages';
import { tagSegment } from './url';

/** One `pages/**\/*.md` imported with `?tags`, as `vitePlugin.ts` turns it into a module at build time. */
export interface PageTags {
  title: string;
  description: string;
  tags: string[];
}

export interface TaggedPage {
  slug: string;
  /** The page's `title`, or its slug if it has none. */
  title: string;
  description: string;
}

// Eager: a tag's page needs every page's tags at once. Only the routes in `src/routes/_tags/` import this file.
const modules = import.meta.glob<PageTags>(['/pages/**/*.md', '!/pages/**/_*.md'], {
  eager: true,
  query: '?tags',
  import: 'default',
});

const byTag = new Map<string, TaggedPage[]>();
for (const [path, { title, description, tags }] of Object.entries(modules)) {
  const slug = slugOf(path);
  for (const tag of tags) {
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag)!.push({ slug, title: title || slug, description });
  }
}

/** Every tag, sorted, with its pages sorted by title. */
export const allTags = [...byTag]
  .map(([tag, pages]) => ({ tag, pages: pages.sort((a, b) => a.title.localeCompare(b.title)) }))
  .sort((a, b) => a.tag.localeCompare(b.tag));

/** The tag whose page has `segment` as the last part of its URL, which is still encoded, e.g. `caf%C3%A9`. */
export function tagAt(segment: string) {
  return allTags.find(({ tag }) => tagSegment(tag) === segment);
}
