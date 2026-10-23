import path from 'node:path';
import { runnerImport, type Plugin } from 'vite';
import { APP_DIR } from '../../appDir';

/**
 * Loads `registry.ts` and `state/Node.ts` once at build start, so a bad `functions/**\/*.ts`
 * (e.g. a keyword used twice) or `nodes/**\/*.{ts,tsx}` (e.g. a type used twice) fails the build.
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
        const options = {
          configFile: false as const,
          root,
          logLevel: 'silent' as const,
          resolve: { alias: { '~': APP_DIR } },
          // Render functions use JSX. They never run here, so any JSX runtime that loads will do.
          oxc: { jsx: { runtime: 'automatic' as const, importSource: 'solid-js/h' } },
        };
        await runnerImport(path.join(APP_DIR, 'lib/nodes/functions/registry.ts'), options);
        await runnerImport(path.join(APP_DIR, 'lib/nodes/state/Node.ts'), options);
      } catch (e) {
        this.error((e as Error).message);
      }
    },
  };
}
