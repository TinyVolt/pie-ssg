import type { Component } from 'solid-js';
import type { CustomModule } from '~/lib/customModules';
import * as checkboxes from './components/checkboxes';
import * as latex from './components/latex';
import * as radio from './components/radio';
import * as slider from './components/slider';
import * as textbox from './components/textbox';

/** A UI: a Solid component. `args` holds the call's positional arguments; its keyword arguments are the other props. */
export type UiComponent = Component<any>;

const BUILTINS: CustomModule[] = [
  { file: 'src/lib/ui/components/checkboxes.tsx', exports: checkboxes },
  { file: 'src/lib/ui/components/latex.tsx', exports: latex },
  { file: 'src/lib/ui/components/radio.tsx', exports: radio },
  { file: 'src/lib/ui/components/slider.tsx', exports: slider },
  { file: 'src/lib/ui/components/textbox.tsx', exports: textbox },
];

const isComponent = (name: string, value: unknown): value is UiComponent =>
  /^[A-Z][A-Za-z0-9]*$/.test(name) && typeof value === 'function';

/** Its name in Python: `Slider` gives `pie.ui.slider`, `MatrixProduct` gives `pie.ui.matrix_product`. */
const pythonName = (exportName: string) => exportName.replace(/(?<!^)([A-Z])/g, '_$1').toLowerCase();

let components = new Map<string, UiComponent>();

/**
 * Replaces the custom UIs with the PascalCase exports of `modules`, e.g. a site's `ui/**\/*.{ts,tsx}`.
 * Throws on a name used twice, leaving the UIs as they were.
 */
export function setCustomUis(modules: CustomModule[]) {
  const uis = new Map<string, UiComponent>();
  const sourceFile = new Map<string, string>();
  for (const { file, exports } of [...BUILTINS, ...modules]) {
    for (const [exportName, value] of Object.entries(exports)) {
      if (!isComponent(exportName, value)) continue;
      const name = pythonName(exportName);
      const other = sourceFile.get(name);
      if (other !== undefined) {
        throw new Error(`Duplicate UI 'pie.ui.${name}': ${file} and ${other}`);
      }
      uis.set(name, value);
      sourceFile.set(name, file);
    }
  }
  components = uis;
}

setCustomUis([]);

export function getUi(name: string): UiComponent | undefined {
  return components.get(name);
}
