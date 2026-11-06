import { buildFeatures, type FeatureData, type FeatureValues } from './features/build';
import { parseFrontmatter, type Frontmatter } from './frontmatter';
import { renderMarkdown } from './render';

/** One page as HTML, with its frontmatter and its features' data. */
export interface Page {
  frontmatter: Frontmatter;
  html: string;
  features: FeatureData;
}

/**
 * Compiles the markdown of the page `file`. Throws, naming the file, on bad frontmatter or a feature's bad value.
 * `site`: each feature's value for a page that leaves its key out.
 * `readFile(from, path)`: the markdown, without its frontmatter, of the file at `path`, set in `from`.
 */
export function compilePage(
  file: string,
  markdown: string,
  site: Partial<FeatureValues>,
  readFile: (from: string, path: string) => string,
  tagLinks: boolean,
): Page {
  const { frontmatter, raw, body } = parseFrontmatter(file, markdown);
  const { data, extensions } = buildFeatures(file, raw, site, readFile, tagLinks);
  return { frontmatter, html: renderMarkdown(body, extensions), features: data };
}

export interface CompileOptions {
  /** The page's name in error messages. Default: `page.md`. */
  file?: string;
  /** What a site's `site.yml` gives: each feature's value for a page that leaves its key out. */
  site?: Partial<FeatureValues>;
  /** The text of another `.md` file, e.g. `_topics.md` for `sidebar: _topics.md`. `path` is as the page wrote it. */
  readFile?(path: string): string;
}

/**
 * Compiles pie markdown into a `Page` for `PiePage`, as a site build would, in the browser or on a server.
 * Throws with the messages a site build gives. Tags are plain text: there are no tag pages to link to.
 */
export function compilePie(markdown: string, options: CompileOptions = {}): Page {
  const { file = 'page.md', site = {}, readFile } = options;
  const read = (_from: string, path: string) => {
    if (!readFile) throw new Error(`file ${path} does not exist`);
    return parseFrontmatter(path, readFile(path)).body;
  };
  return compilePage(file, markdown, site, read, false);
}
