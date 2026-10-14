import { parseFrontmatter } from './frontmatter';

const files = import.meta.glob('/pages/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Slug -> page. `/pages/a/b.md` has the slug `a/b`.
export const pages = new Map(
  Object.entries(files).map(([path, markdown]) => [
    path.replace(/^\/pages\//, '').replace(/\.md$/, ''),
    parseFrontmatter(path.slice(1), markdown),
  ]),
);
