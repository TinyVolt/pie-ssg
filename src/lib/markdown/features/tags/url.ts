/** The page listing every tag. Starts with `_` so it can't be taken by a site's own page. */
export const TAGS_URL = '/_tags';

/** The last part of the URL of the page for `tag`. Not `encodeURIComponent`: prerendering would encode its `%2B` again. */
export function tagSegment(tag: string): string {
  return encodeURI(tag);
}

/** The page listing the pages with `tag`. */
export function tagUrl(tag: string): string {
  return `${TAGS_URL}/${tagSegment(tag)}`;
}
