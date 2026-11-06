import path from 'node:path';
import { runnerImport, type Plugin } from 'vite';
import { APP_DIR } from '../../appDir';

/**
 * Loads `siteModules.ts` once at build start, so a bad `functions/**\/*.ts` (e.g. a keyword used twice),
 * `nodes/**\/*.{ts,tsx}` (e.g. a type used twice) or `ui/**\/*.{ts,tsx}` (e.g. a name used twice) fails the build.
 * Without this, the error only stops pages from prerendering.
 */
export function checkFunctions(): Plugin {
  let root = '';
  let checked = false;

  return {
    name: 'check-functions',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    // Runs once per build environment (client, ssr, ...); one check is enough.
    async buildStart() {
      if (checked) return;
      checked = true;
      try {
        await runnerImport(path.join(APP_DIR, 'lib/siteModules.ts'), {
          configFile: false,
          root,
          logLevel: 'silent',
          resolve: { alias: { '~': APP_DIR } },
          // Render functions and UIs use JSX. They never run here, so any JSX runtime that loads will do.
          oxc: { jsx: { runtime: 'automatic', importSource: 'solid-js/h' } },
        });
      } catch (e) {
        this.error((e as Error).message);
      }
    },
  };
}
