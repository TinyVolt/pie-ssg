import type { CustomModule } from '~/lib/customModules';
import { Node2NodeFunc, SideEffectFunc } from './Node2NodeFunc';
import * as basicNodes from './basic';
import * as autodiffNodes from './autodiff';
import * as arrayNodes from './array';
import * as sideEffects from './sideEffects';

const isNode2NodeFunc = (fn: unknown): fn is Node2NodeFunc =>
  typeof fn === 'object' && fn !== null && typeof (fn as Node2NodeFunc).compute === 'function';

const isSideEffectFunc = (fn: unknown): fn is SideEffectFunc =>
  typeof fn === 'object' && fn !== null && typeof (fn as SideEffectFunc).run === 'function';

const BUILTINS: CustomModule[] = [
  { file: 'src/lib/nodes/functions/basic.ts', exports: basicNodes },
  { file: 'src/lib/nodes/functions/autodiff.ts', exports: autodiffNodes },
  { file: 'src/lib/nodes/functions/array.ts', exports: arrayNodes },
  { file: 'src/lib/nodes/functions/sideEffects.ts', exports: sideEffects },
];

let functionRegistry = new Map<string, Node2NodeFunc>();
let sideEffectRegistry = new Map<string, SideEffectFunc>();

/**
 * Replaces the custom functions with the `Node2NodeFunc`s and `SideEffectFunc`s that `modules` export, e.g. a site's `functions/**\/*.ts`.
 * Throws on a keyword used twice, leaving the functions as they were.
 */
export function setCustomFunctions(modules: CustomModule[]) {
  const functions = new Map<string, Node2NodeFunc>();
  const effects = new Map<string, SideEffectFunc>();
  const sourceFile = new Map<string, string>();
  for (const { file, exports } of [...BUILTINS, ...modules]) {
    for (const fn of Object.values(exports).filter(fn => isNode2NodeFunc(fn) || isSideEffectFunc(fn))) {
      const other = sourceFile.get(fn.keyword);
      if (other !== undefined) {
        throw new Error(`Duplicate function keyword '${fn.keyword}': ${file} and ${other}`);
      }
      if (isSideEffectFunc(fn)) effects.set(fn.keyword, fn);
      else functions.set(fn.keyword, fn);
      sourceFile.set(fn.keyword, file);
    }
  }
  functionRegistry = functions;
  sideEffectRegistry = effects;
}

setCustomFunctions([]);

export function getFunction(keyword: string): Node2NodeFunc | undefined {
  return functionRegistry.get(keyword);
}

export function getSideEffect(keyword: string): SideEffectFunc | undefined {
  return sideEffectRegistry.get(keyword);
}
