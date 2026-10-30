/**
 * A feature is an optional extra that a page turns on in its frontmatter, e.g. `sidebar: _topics.md`.
 * If the page leaves the key out, the value in `site.yml` is used.
 *
 * Each feature has two halves:
 * - Build half (this file). Runs in Node when the site is generated. Its `build` turns the frontmatter value
 *   into data, e.g. the path `_topics.md` into that file's HTML. The data is saved in the page's JSON.
 * - View half (`views.tsx`). Runs in the browser. A component that gets that data and wraps the page,
 *   e.g. draws the sidebar next to it.
 *
 * To add a feature: add its build half to `FEATURES` below, and its view, if it has one, to `VIEWS` in `views.tsx`.
 * A feature that only changes the page's HTML, like `toc`, has no view.
 */
import type { MarkedExtension } from 'marked';
import type { Field } from '../frontmatter';
import { glossary } from './glossary/build';
import { sidebar } from './sidebar/build';
import { tags } from './tags/build';
import { toc } from './toc/build';

/** The second argument to a feature's `build`. */
export interface BuildContext {
  /** The page, e.g. `pages/about.md`. */
  file: string;
  /** The file that set the value: the page, or `site.yml`. */
  from: string;
  /** The markdown of the `.md` file at `path`, relative to the folder of `from`, without its frontmatter. Throws if it's missing or outside the project. */
  readFile(path: string): string;
}

/** A feature's build half. `T`: its frontmatter value. `D`: the data its view gets. */
export interface FeatureBuild<T, D> {
  field: Field<T>;
  /** Returns `undefined` to turn the feature off on this page. */
  build(value: T, ctx: BuildContext): D | undefined;
  /** Extra markdown syntax for this page. Called only when `build` didn't turn the feature off. */
  markdown?(value: T, ctx: BuildContext): MarkedExtension;
}

/**
 * Keyed by frontmatter key. The last feature's `postprocess` runs first, so `tags`, being after `glossary`,
 * ends the page's text and the glossary comes after it.
 */
const FEATURES = { sidebar, toc, glossary, tags };

type DataOf<F> = F extends FeatureBuild<any, infer D> ? D : never;

// Today: `{ sidebar?: string; toc?: true; glossary?: true; tags?: true }`.
export type FeatureData = { [K in keyof typeof FEATURES]?: DataOf<(typeof FEATURES)[K]> };

// Today: `{ sidebar: sidebar.field, toc: toc.field, glossary: glossary.field, tags: tags.field }`. `site.yml` reads these too.
export const FEATURE_FIELDS = Object.fromEntries(
  Object.entries(FEATURES).map(([key, feature]) => [key, feature.field]),
) as { [K in keyof typeof FEATURES]: (typeof FEATURES)[K]['field'] };

/** Runs every feature's `build` for the page `file`. Throws, naming the file and key, on a bad value. */
export function buildFeatures(
  file: string,
  raw: Record<string, string>,
  site: Record<string, unknown>,
  readFile: (from: string, path: string) => string,
): { data: FeatureData; extensions: MarkedExtension[] } {
  const data: Record<string, unknown> = {};
  const extensions: MarkedExtension[] = [];
  for (const [key, feature] of Object.entries(FEATURES) as [string, FeatureBuild<unknown, unknown>][]) {
    const from = Object.hasOwn(raw, key) ? file : 'site.yml';
    try {
      const value = from === file ? feature.field.parse(raw[key]) : site[key];
      const ctx: BuildContext = { file, from, readFile: path => readFile(from, path) };
      const built = feature.build(value, ctx);
      if (built === undefined) continue;
      data[key] = built;
      if (feature.markdown) extensions.push(feature.markdown(value, ctx));
    } catch (e) {
      throw new Error(`${from}: \`${key}\` ${(e as Error).message}`);
    }
  }
  return { data: data as FeatureData, extensions };
}
