// `pie()`: every Vite plugin a pie-ssg site needs. A site's `vite.config.ts` is `plugins: [pie()]`.
import path from 'node:path';
import type { Plugin, PluginOption } from 'vite';
import { nitro } from 'nitro/vite';
import { solidStart } from '@solidjs/start/config';
import { APP_DIR } from './src/lib/appDir';
import { checkPageRoutes, markdownPages } from './src/lib/markdown/vitePlugin';
import { checkFunctions } from './src/lib/nodes/functions/vitePlugin';
import { checkLayouts } from './src/lib/layouts/vitePlugin';
import { siteConfig } from './src/lib/site/vitePlugin';

/**
 * `~/...` in a site's own files (`functions/`, `nodes/`, `layouts/`) means the app's `src/`.
 * SolidStart's `~` alias skips files outside the app's package, which a site's files are.
 */
function siteAlias(): Plugin {
  return {
    name: 'pie-site-alias',
    enforce: 'pre',
    async resolveId(id, importer, options) {
      if (id !== '~' && !id.startsWith('~/')) return null;
      const target = path.join(APP_DIR, id.slice(1));
      return (await this.resolve(target, importer, { ...options, skipSelf: true })) ?? target;
    },
  };
}

/** Pre-bundles SolidStart's `@jridgewell/trace-mapping`, reached through `@tinyvolt/pie` in a site. */
function optimizeDeps(): Plugin {
  return {
    name: 'pie-optimize-deps',
    config(config) {
      const inRepo = path.resolve(config.root ?? process.cwd()) === path.dirname(APP_DIR);
      const dep = '@solidjs/start > @jridgewell/trace-mapping';
      return { optimizeDeps: { include: [inRepo ? dep : `@tinyvolt/pie > ${dep}`] } };
    },
  };
}

/**
 * Bundles one copy of `solid-js`: the site's. `@solidjs/start` can install its own, newer copy,
 * and two copies in the browser break `<Suspense>` ("Cannot read properties of null (reading 'push')").
 */
function dedupeSolid(): Plugin {
  return {
    name: 'pie-dedupe-solid',
    config() {
      return { resolve: { dedupe: ['solid-js'] } };
    },
  };
}

export function pie(): PluginOption[] {
  return [
    siteAlias(), optimizeDeps(), dedupeSolid(),
    markdownPages(), checkPageRoutes(), checkFunctions(), checkLayouts(), siteConfig(),
    // SolidStart resolves `appRoot` against the working directory.
    solidStart({ appRoot: path.relative(process.cwd(), APP_DIR) }),
    nitro({ prerender: { crawlLinks: true, routes: ['/', '/pages'] } }),
  ];
}
