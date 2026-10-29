import { Accessor, createContext, untrack, useContext } from 'solid-js';
import type { AnyNode } from '~/lib/nodes/state/Node';
import type { NodeStore } from '~/lib/nodes/state/NodeStore';
import { replaceNode } from '~/lib/nodes/functions/sideEffects';

/** A node passed to a UI, as a Solid signal pair: read it with `n()`, write it with `setN(changes)`. */
export type NodeHandle<N extends AnyNode = AnyNode> = [Accessor<N>, (changes: Partial<N>) => void];

/** A positional argument of `pie.ui.<name>(...)`: a node, or a list of them at any depth. */
export type UiArg = NodeHandle | UiArg[];

export const isHandle = (arg: UiArg): arg is NodeHandle => typeof arg[0] === 'function';

/**
 * Saves `node` with `changes`, like dragging a point: it no longer follows its inputs.
 * To change an Array, write its items: replacing the Array removes its item nodes.
 */
function setNode<N extends AnyNode>(store: NodeStore, node: N, changes: Partial<N>) {
  replaceNode(store, node, changes, false);
}

/** Reads node `id` from the store each time, so it follows the node when it is replaced. */
export function nodeHandle<N extends AnyNode>(store: NodeStore, id: string): NodeHandle<N> {
  const get = () => store.getNodeValue(id) as N;
  const set = (changes: Partial<N>) => {
    const node = untrack(get);
    if (node && node.type !== 'Dummy') setNode(store, node, changes);
  };
  return [get, set];
}

export const StoreContext = createContext<NodeStore>();

/** Inside a UI: writes a node it did not get as an argument, e.g. an Array's item. */
export function useSetNode() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useSetNode works only inside a UI');
  return <N extends AnyNode>(node: N, changes: Partial<N>) => setNode(store, node, changes);
}

/** `arg` as a node of one of `types`. Throws otherwise; the UI shows the error. */
export function expectNode<N extends AnyNode>(arg: UiArg | undefined, types: N['type'][]): NodeHandle<N> {
  if (arg === undefined || !isHandle(arg)) throw new Error(`expects a ${types.join(' or ')} node, got ${arg === undefined ? 'nothing' : 'a list'}`);
  const type = untrack(arg[0]).type;
  if (!types.includes(type as N['type'])) throw new Error(`expects a ${types.join(' or ')} node, got a ${type}`);
  return arg as unknown as NodeHandle<N>;
}
