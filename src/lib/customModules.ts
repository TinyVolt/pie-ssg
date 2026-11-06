import { setCustomFunctions } from './nodes/functions/registry';
import { setCustomNodes } from './nodes/state/Node';
import { setCustomUis } from './ui/registry';

/** A file of a site's or a host's own code. `exports`: what `import * as m from '...'` gives. `file` is for error messages. */
export interface CustomModule {
  file: string;
  exports: Record<string, unknown>;
}

/** Own code, by kind: `Node2NodeFunc`s and `SideEffectFunc`s, `NodeDefinition`s, and UIs (PascalCase components). */
export interface CustomModules {
  functions?: CustomModule[];
  nodes?: CustomModule[];
  ui?: CustomModule[];
}

/** Replaces the custom functions, node types and UIs. Built-ins always stay. Throws on a name used twice, leaving none. */
export function setCustomModules(modules: CustomModules) {
  try {
    setCustomFunctions(modules.functions ?? []);
    setCustomNodes(modules.nodes ?? []);
    setCustomUis(modules.ui ?? []);
  } catch (e) {
    setCustomFunctions([]);
    setCustomNodes([]);
    setCustomUis([]);
    throw e;
  }
}
