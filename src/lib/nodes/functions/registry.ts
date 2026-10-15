import { Node2NodeFunc } from './Node2NodeFunc';
import * as basicNodes from './basic';
import * as autodiffNodes from './autodiff';

const isNode2NodeFunc = (fn: unknown): fn is Node2NodeFunc =>
  typeof fn === 'object' && fn !== null && typeof (fn as Node2NodeFunc).keyword === 'string';

export const functionRegistry = new Map<string, Node2NodeFunc>(
  [...Object.values(basicNodes), ...Object.values(autodiffNodes)].filter(isNode2NodeFunc).map(fn => [fn.keyword, fn])
);

export function getFunction(keyword: string): Node2NodeFunc | undefined {
  return functionRegistry.get(keyword);
}
