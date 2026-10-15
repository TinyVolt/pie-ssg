import path from 'node:path';
import { runnerImport, type Plugin } from 'vite';

/**
 * Loads `registry.ts` once at build start, so a bad `functions/**\/*.ts` (e.g. a keyword
 * used twice) fails the build. Without this, the error only stops pages from prerendering.
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
        await runnerImport(path.join(root, 'src/lib/nodes/functions/registry.ts'), {
          configFile: false,
          root,
          logLevel: 'silent',
          resolve: { alias: { '~': path.join(root, 'src') } },
        });
      } catch (e) {
        this.error((e as Error).message);
      }
    },
  };
}
