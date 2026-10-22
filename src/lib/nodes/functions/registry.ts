import { Node2NodeFunc, SideEffectFunc } from './Node2NodeFunc';
import * as basicNodes from './basic';
import * as autodiffNodes from './autodiff';
import * as arrayNodes from './array';
import * as sideEffects from './sideEffects';

const isNode2NodeFunc = (fn: unknown): fn is Node2NodeFunc =>
  typeof fn === 'object' && fn !== null && typeof (fn as Node2NodeFunc).compute === 'function';

const isSideEffectFunc = (fn: unknown): fn is SideEffectFunc =>
  typeof fn === 'object' && fn !== null && typeof (fn as SideEffectFunc).run === 'function';

// The site's own functions: each `functions/**/*.ts` exports `Node2NodeFunc`s, like `basic.ts`.
const customModules = import.meta.glob<Record<string, unknown>>('/functions/**/*.ts', { eager: true });

// File path -> its exports. Built-ins first.
const modules: [string, Record<string, unknown>][] = [
  ['src/lib/nodes/functions/basic.ts', basicNodes],
  ['src/lib/nodes/functions/autodiff.ts', autodiffNodes],
  ['src/lib/nodes/functions/array.ts', arrayNodes],
  ['src/lib/nodes/functions/sideEffects.ts', sideEffects],
  ...Object.entries(customModules).map(([path, mod]): [string, Record<string, unknown>] => [path.slice(1), mod]),
];

export const functionRegistry = new Map<string, Node2NodeFunc>();
export const sideEffectRegistry = new Map<string, SideEffectFunc>();
const sourceFile = new Map<string, string>();
for (const [file, mod] of modules) {
  for (const fn of Object.values(mod).filter(fn => isNode2NodeFunc(fn) || isSideEffectFunc(fn))) {
    const other = sourceFile.get(fn.keyword);
    if (other !== undefined) {
      throw new Error(`Duplicate function keyword '${fn.keyword}': ${file} and ${other}`);
    }
    if (isSideEffectFunc(fn)) sideEffectRegistry.set(fn.keyword, fn);
    else functionRegistry.set(fn.keyword, fn);
    sourceFile.set(fn.keyword, file);
  }
}

export function getFunction(keyword: string): Node2NodeFunc | undefined {
  return functionRegistry.get(keyword);
}

export function getSideEffect(keyword: string): SideEffectFunc | undefined {
  return sideEffectRegistry.get(keyword);
}
