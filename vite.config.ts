import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

import { solidStart } from "@solidjs/start/config";
import { markdownPages } from "./src/lib/markdown/vitePlugin";
import { checkFunctions } from "./src/lib/nodes/functions/vitePlugin";

export default defineConfig({
  plugins: [markdownPages(), checkFunctions(), solidStart(),
    nitro({ prerender: { crawlLinks: true, routes: ['/', '/pages'] } })
  ],
  optimizeDeps: {
    include: [
      "@solidjs/start > source-map-js",
      "@solidjs/start > error-stack-parser"
    ]
  }
});
