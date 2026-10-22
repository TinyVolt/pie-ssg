import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

import { solidStart } from "@solidjs/start/config";
import { checkPageRoutes, markdownPages } from "./src/lib/markdown/vitePlugin";
import { checkFunctions } from "./src/lib/nodes/functions/vitePlugin";
import { checkLayouts } from "./src/lib/layouts/vitePlugin";
import { siteConfig } from "./src/lib/site/vitePlugin";

export default defineConfig({
  plugins: [markdownPages(), checkPageRoutes(), checkFunctions(), checkLayouts(), siteConfig(), solidStart(),
    nitro({ prerender: { crawlLinks: true, routes: ['/', '/pages'] } })
  ],
  optimizeDeps: {
    include: [
      "@solidjs/start > @jridgewell/trace-mapping"
    ]
  }
});
