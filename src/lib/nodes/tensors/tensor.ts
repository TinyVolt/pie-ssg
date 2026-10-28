import type { Arg, ExecuteResult } from '../execute';
import type { NodeStore } from '../state/NodeStore';
import { NodeType } from '../state/Node';

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

/** The node at `position` of array `arrayId`'s items. Creates nothing. */
export function getItem(store: NodeStore, arrayId: string, position: number): ExecuteResult {
  const array = store.getNodeValue(arrayId);
  if (array?.type !== 'Array') throw new Error(`'${arrayId}' is not an array`);
  const item = array.items[position];
  if (item.type === 'Dummy') throw new Error(`item ${position} of '${arrayId}' is Dummy`);
  return { id: item.id, type: item.type };
}

/** The one type all items of a nested list share, or 'Mixed' when they differ. `typeOf` gives an item's type. */
export function listItemType(list: Arg[], typeOf: (item: LeafArg) => string): NodeType | 'Mixed' {
  listShape(list);
  const types = new Set(leaves(list).map(typeOf));
  if (types.size > 1) return 'Mixed';
  return [...types][0] as NodeType;
}
