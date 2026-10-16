import type { Arg } from './execute';
import { NodeType } from './state/Node';

export type LeafArg = Exclude<Arg, Arg[]>;

/** The items of a nested list, in row-major order. */
export const leaves = (list: Arg[]): LeafArg[] => list.flatMap(item => Array.isArray(item) ? leaves(item) : [item]);

/** A nested list's shape: [[a, b], [c, d]] has shape [2, 2]. */
export function listShape(list: Arg[]): number[] {
  if (list.length === 0) throw new Error('a list must not be empty');
  const shapes = list.map(item => Array.isArray(item) ? listShape(item) : []);
  if (shapes.some(shape => shape.join() !== shapes[0].join())) {
    throw new Error('nested lists must all have the same length');
  }
  return [list.length, ...shapes[0]];
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** The one type all items of a nested list share. `typeOf` gives an item's type. */
export function listItemType(list: Arg[], typeOf: (item: LeafArg) => string): NodeType {
  listShape(list);
  const types = new Set(leaves(list).map(typeOf));
  if (types.size > 1) {
    throw new Error(`all items of a list must have the same type, got ${[...types].join(', ')}`);
  }
  return [...types][0] as NodeType;
}
