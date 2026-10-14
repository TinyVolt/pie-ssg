import { globSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import { nitro } from "nitro/vite";

import { solidStart } from "@solidjs/start/config";
import { parseFrontmatter } from "./src/lib/markdown/frontmatter";

// Fails the build on bad frontmatter. Thrown during prerendering, the same error
// only kills the prerender worker and the build still exits 0.
function checkPages(): Plugin {
  return {
    name: "check-pages",
    buildStart() {
      for (const path of globSync("pages/**/*.md")) parseFrontmatter(path, readFileSync(path, "utf8"));
    },
  };
}

export default defineConfig({
  plugins: [checkPages(), solidStart(),
    nitro({ prerender: { crawlLinks: true, routes: ['/', '/pages'] } })
  ],
  optimizeDeps: {
    include: [
      "@solidjs/start > source-map-js",
      "@solidjs/start > error-stack-parser"
    ]
  }
});
