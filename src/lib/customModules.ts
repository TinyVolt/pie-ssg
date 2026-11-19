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

const KINDS = ['functions', 'nodes', 'ui'] as const;

/** Same files with the same exports. A host may build a new `modules` object each render, so the objects can differ. */
const sameModules = (a: CustomModules, b: CustomModules) =>
  KINDS.every((kind) => {
    const x = a[kind] ?? [];
    const y = b[kind] ?? [];
    return x.length === y.length && x.every((m, i) => m.file === y[i].file && m.exports === y[i].exports);
  });

// The modules set by `holdCustomModules`, and how many holders use them.
let held: { modules: CustomModules; count: number } | undefined;

/**
 * Sets `modules` until the returned function is called. Other holders can use the same modules meanwhile;
 * different ones throw `conflict`. The last holder to let go clears them.
 * Throws on a name used twice, as `setCustomModules` does.
 */
export function holdCustomModules(modules: CustomModules, conflict: string): () => void {
  if (held) {
    if (!sameModules(held.modules, modules)) throw new Error(conflict);
    held.count++;
  } else {
    setCustomModules(modules);
    held = { modules, count: 1 };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--held!.count === 0) {
      held = undefined;
      setCustomModules({});
    }
  };
}
