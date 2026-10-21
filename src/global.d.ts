/// <reference types="@solidjs/start/env" />

// The root `site.yml`, turned into a module by `src/lib/site/vitePlugin.ts`.
declare module '*/site.yml' {
  const site: import('./lib/site/vitePlugin').Site;
  export default site;
}
