const files = import.meta.glob('/pages/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Slug -> markdown. `/pages/a/b.md` has the slug `a/b`.
export const pages = new Map(
  Object.entries(files).map(([path, markdown]) => [
    path.replace(/^\/pages\//, '').replace(/\.md$/, ''),
    markdown,
  ]),
);
