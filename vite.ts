// `pie()`: every Vite plugin a pie-ssg site needs. A site's `vite.config.ts` is `plugins: [pie()]`.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginOption } from 'vite';
import { nitro } from 'nitro/vite';
import type { NitroModule } from 'nitro/types';
import { solidStart } from '@solidjs/start/config';
import { APP_DIR } from './src/lib/appDir';
import { checkPageRoutes, markdownPages } from './src/lib/markdown/vitePlugin';
import { checkFunctions } from './src/lib/nodes/functions/vitePlugin';
import { checkLayouts } from './src/lib/layouts/vitePlugin';
import { parseSite, siteConfig } from './src/lib/site/vitePlugin';

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

/**
 * After prerendering, writes `sitemap.xml` (every prerendered page) and `robots.txt` (pointing to it).
 * Both need `site.yml`'s `url`; without it they are skipped with a warning. A site's own `public/` file wins.
 */
function seoFiles(): NitroModule {
  return {
    name: 'pie-seo-files',
    setup(nitro) {
      nitro.hooks.hook('prerender:done', ({ prerenderedRoutes }) => {
        const { url } = parseSite('site.yml', fs.readFileSync(path.join(nitro.options.rootDir, 'site.yml'), 'utf8'));
        if (!url) {
          nitro.logger.warn('site.yml has no `url`: skipped sitemap.xml, robots.txt, canonical links and og:url. Add e.g. `url: https://example.com` before deploying.');
          return;
        }
        const pages = prerenderedRoutes.filter(route => route.fileName?.endsWith('.html')).map(route => route.route).sort();
        const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const write = (name: string, contents: string) => {
          const file = path.join(nitro.options.output.publicDir, name);
          if (!fs.existsSync(file)) fs.writeFileSync(file, contents);
        };
        write('sitemap.xml', [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...pages.map(page => `  <url><loc>${escape(url + page)}</loc></url>`),
          '</urlset>',
          '',
        ].join('\n'));
        write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`);
      });
    },
  };
}

export function pie(): PluginOption[] {
  return [
    siteAlias(), optimizeDeps(), dedupeSolid(),
    markdownPages(), checkPageRoutes(), checkFunctions(), checkLayouts(), siteConfig(),
    // SolidStart resolves `appRoot` against the working directory.
    solidStart({ appRoot: path.relative(process.cwd(), APP_DIR) }),
    nitro({ prerender: { crawlLinks: true, routes: ['/', '/pages'] }, modules: [seoFiles()] }),
  ];
}
