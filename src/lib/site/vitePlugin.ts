import path from 'node:path';
import type { Plugin } from 'vite';
import { parseKeyValues, readFields, text, type Values } from '../markdown/frontmatter';

/** Every field `site.yml` can set. Keys not listed here are ignored. */
const FIELDS = {
  /** Shown in the header and in every browser tab title. */
  title: text(''),
};

export type Site = Values<typeof FIELDS>;

/** Reads `site.yml`. Throws, naming the file, on a bad line or a missing `title`. */
function parseSite(file: string, yml: string): Site {
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
