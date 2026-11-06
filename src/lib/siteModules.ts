// The site's own functions, node types and UIs: its `functions/`, `nodes/` and `ui/` folders.
// The page route imports this file. `checkFunctions` loads it at build start, so a name used twice fails the build.
import { setCustomModules, type CustomModule } from './customModules';

/** `/functions/a.ts` -> `functions/a.ts`, with its exports. */
const files = (modules: Record<string, Record<string, unknown>>): CustomModule[] =>
  Object.entries(modules).map(([path, exports]) => ({ file: path.slice(1), exports }));

setCustomModules({
  functions: files(import.meta.glob('/functions/**/*.ts', { eager: true })),
  nodes: files(import.meta.glob('/nodes/**/*.{ts,tsx}', { eager: true })),
  ui: files(import.meta.glob('/ui/**/*.{ts,tsx}', { eager: true })),
});
