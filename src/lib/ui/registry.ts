import type { Component } from 'solid-js';

/** A UI: a Solid component. `args` holds the call's positional arguments; its keyword arguments are the other props. */
export type UiComponent = Component<any>;

// Built-ins, then the site's own: each PascalCase export of a `ui/**/*.{ts,tsx}` file is a UI.
const builtinModules = import.meta.glob<Record<string, unknown>>('./components/*.tsx', { eager: true });
const customModules = import.meta.glob<Record<string, unknown>>('/ui/**/*.{ts,tsx}', { eager: true });

const isComponent = (name: string, value: unknown): value is UiComponent =>
  /^[A-Z][A-Za-z0-9]*$/.test(name) && typeof value === 'function';

/** Its name in Python: `Slider` gives `pie.ui.slider`, `MatrixProduct` gives `pie.ui.matrix_product`. */
const pythonName = (exportName: string) => exportName.replace(/(?<!^)([A-Z])/g, '_$1').toLowerCase();

const components = new Map<string, UiComponent>();
const sourceFile = new Map<string, string>();
for (const [file, mod] of [...Object.entries(builtinModules), ...Object.entries(customModules)]) {
  for (const [exportName, value] of Object.entries(mod)) {
    if (!isComponent(exportName, value)) continue;
    const name = pythonName(exportName);
    const other = sourceFile.get(name);
    if (other !== undefined) {
      throw new Error(`Duplicate UI 'pie.ui.${name}': ${file} and ${other}`);
    }
    components.set(name, value);
    sourceFile.set(name, file);
  }
}

export function getUi(name: string): UiComponent | undefined {
  return components.get(name);
}
