import type { Component } from 'solid-js';

export type LayoutModules = Record<string, { default?: Component }>;

/**
 * The default export of a `layouts/` file, given an `import.meta.glob` of that one file,
 * or `builtIn` when the site has no such file. Throws, naming the file, when it has no default export.
 */
export function layout(modules: LayoutModules, builtIn: Component): Component {
  const [entry] = Object.entries(modules);
  if (!entry) return builtIn;
  const [file, mod] = entry;
  if (typeof mod.default !== 'function') throw new Error(noDefaultExport(file.slice(1)));
  return mod.default;
}

/** Shared with `vitePlugin.ts`, so dev and build say the same thing. */
export function noDefaultExport(file: string): string {
  return `${file} must have a default export: a Solid component`;
}
