import path from 'node:path';
import type { Plugin } from 'vite';
import { parseKeyValues, readFields, text, type Field, type Values } from '../markdown/frontmatter';

/** An `http://` or `https://` address, without a trailing `/`. */
function address(): Field<string> {
  return {
    default: '',
    parse(raw) {
      if (!/^https?:\/\/[^\s/]+/.test(raw)) throw new Error(`must start with http:// or https://, got ${JSON.stringify(raw)}`);
      return raw.replace(/\/+$/, '');
    },
  };
}

/** Every field `site.yml` can set. Keys not listed here are ignored. */
const FIELDS = {
  /** Shown in the header and in every browser tab title. */
  title: text(''),
  /** Where the site is deployed, e.g. `https://example.com`. Empty: no sitemap, robots.txt, canonical links or `og:url`. */
  url: address(),
  /** The search-result description of a page that has no `description` of its own. */
  description: text(''),
};

export type Site = Values<typeof FIELDS>;

/** Reads `site.yml`. Throws, naming the file, on a bad line or a missing `title`. */
export function parseSite(file: string, yml: string): Site {
  try {
    const site = readFields(FIELDS, parseKeyValues(yml));
    if (!site.title) throw new Error('`title` is required');
    return site;
  } catch (e) {
    throw new Error(`${file}: ${(e as Error).message}`);
  }
}

/**
 * Turns the root `site.yml` into a module whose default export is a `Site`, at build time.
 * Bad settings fail the build; in dev it shows Vite's error screen.
 */
export function siteConfig(): Plugin {
  let root = '';

  return {
    name: 'site-config',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    transform(yml, id) {
      const file = path.relative(root, id.split('?')[0]);
      if (file !== 'site.yml') return;
      return { code: `export default ${JSON.stringify(parseSite(file, yml))};`, map: null };
    },
  };
}
