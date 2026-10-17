import { Node2NodeFunc } from './Node2NodeFunc';
import * as basicNodes from './basic';
import * as autodiffNodes from './autodiff';
import * as arrayNodes from './array';

const isNode2NodeFunc = (fn: unknown): fn is Node2NodeFunc =>
  typeof fn === 'object' && fn !== null && typeof (fn as Node2NodeFunc).keyword === 'string';

// The site's own functions: each `functions/**/*.ts` exports `Node2NodeFunc`s, like `basic.ts`.
const customModules = import.meta.glob<Record<string, unknown>>('/functions/**/*.ts', { eager: true });

// File path -> its exports. Built-ins first.
const modules: [string, Record<string, unknown>][] = [
  ['src/lib/nodes/functions/basic.ts', basicNodes],
  ['src/lib/nodes/functions/autodiff.ts', autodiffNodes],
  ['src/lib/nodes/functions/array.ts', arrayNodes],
  ...Object.entries(customModules).map(([path, mod]): [string, Record<string, unknown>] => [path.slice(1), mod]),
];

export const functionRegistry = new Map<string, Node2NodeFunc>();
const sourceFile = new Map<string, string>();
for (const [file, mod] of modules) {
  for (const fn of Object.values(mod).filter(isNode2NodeFunc)) {
    const other = sourceFile.get(fn.keyword);
    if (other !== undefined) {
      throw new Error(`Duplicate function keyword '${fn.keyword}': ${file} and ${other}`);
    }
    functionRegistry.set(fn.keyword, fn);
    sourceFile.set(fn.keyword, file);
  }
}

export function getFunction(keyword: string): Node2NodeFunc | undefined {
  return functionRegistry.get(keyword);
}
