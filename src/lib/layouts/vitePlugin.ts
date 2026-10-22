import fs from 'node:fs';
import path from 'node:path';
import { parseSync, type Plugin } from 'vite';
import { noDefaultExport } from './layout';

// Each `layouts/` file that replaces a built-in part of the site.
const LAYOUT_FILES = ['layouts/header.tsx', 'layouts/index.tsx'];

/**
 * Fails the build when a `layouts/` file has no default export.
 * Without this, the error only stops pages from prerendering.
 */
export function checkLayouts(): Plugin {
  let root = '';
  let checked = false;

  return {
    name: 'check-layouts',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    // Runs once per build environment (client, ssr, ...); one check is enough.
    buildStart() {
      if (checked) return;
      checked = true;
      const bad = LAYOUT_FILES.filter(file => {
        const full = path.join(root, file);
        if (!fs.existsSync(full)) return false;
        const { module, errors } = parseSync(full, fs.readFileSync(full, 'utf8'));
        // Vite reports syntax errors itself, with a better message.
        if (errors.length) return false;
        return !module.staticExports.some(e =>
          e.entries.some(entry => entry.exportName.kind === 'Default' || entry.exportName.name === 'default'));
      });
      if (bad.length) this.error(bad.map(noDefaultExport).join('\n'));
    },
  };
}
