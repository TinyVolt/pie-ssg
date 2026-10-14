import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

import { solidStart } from "@solidjs/start/config";

export default defineConfig({
  plugins: [solidStart(),
    nitro({ prerender: { crawlLinks: true, routes: ['/', '/pages'] } })
  ],
  optimizeDeps: {
    include: [
      "@solidjs/start > source-map-js",
      "@solidjs/start > error-stack-parser"
    ]
  }
});
