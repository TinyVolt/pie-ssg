import { batch, createMemo, createRoot } from 'solid-js';
import { getFunction, getSideEffect } from './functions/registry';
import { NodeReconciler, ParameterDefinition } from './functions/Node2NodeFunc';
import { NodeStore } from './state/NodeStore';
import { AnyNode, ArrayNode, NodeType, ScalarNode, TextNode, checkColor } from './state/Node';
import { scalar } from './jax';
import { leaves, listItemType, listShape, sha256 } from './tensors/tensor';
import { broadcastItems, broadcastShapes, isBroadcast } from './tensors/broadcast';
import { play, type Prepare, type Track } from './animation';

/** One argument of a Python call: a number, a string, a handle to an existing node, or a nested list of these. */
export type Arg = number | string | { id: string } | Arg[];

export interface ExecuteResult {
  id: string;
  type: string;
  /** Only for an Array. */
  shape?: number[];
  itemType?: string;
}

function saveLiteral(store: NodeStore, node: AnyNode): string {
  createRoot((dispose) => {
    store.saveNode(node.id, createMemo(() => node), dispose);
  });
  return node.id;
}

/** What an argument is, before any node is created for it. */
function argType(arg: Arg, store: NodeStore): string {
  if (Array.isArray(arg)) {
    listItemType(arg, item => argType(item, store));
    return 'Array';
  }
  if (typeof arg === 'number') return 'Scalar';
  if (typeof arg === 'string') return 'Text';
  const node = store.getNodeValue(arg.id);
  if (!node) throw new Error(`Unknown node '${arg.id}'`);
  return node.type;
}

/** The item type and shape of an argument that is an array, before any node is created for it. */
function arrayOf(arg: Arg, store: NodeStore): { itemType: NodeType | 'Mixed'; shape: number[] } {
  if (Array.isArray(arg)) return { itemType: listItemType(arg, item => argType(item, store)), shape: listShape(arg) };
  return store.getNodeValue((arg as { id: string }).id) as ArrayNode;
}

/** The types of the items of an argument that is an array, without repeats. */
function itemTypesOf(arg: Arg, store: NodeStore): string[] {
  if (Array.isArray(arg)) return [...new Set(leaves(arg).map(item => argType(item, store)))];
  return [...new Set((store.getNodeValue((arg as { id: string }).id) as ArrayNode).items.map(item => item.type))];
}

/**
 * A list gets one hidden Array node, reused by every call that passes the same list.
 * Its items follow the nodes they name.
 */
async function resolveList(list: Arg[], store: NodeStore): Promise<string> {
  const id = `_literal_arr_${await sha256(JSON.stringify(list))}`;
  if (store.getNodeValue(id)) return id;
  const shape = listShape(list);
  const itemType = listItemType(list, item => argType(item, store));
  const itemIds = await Promise.all(leaves(list).map(item => resolveArg(item, store)));
  createRoot((dispose) => {
    const node = createMemo(() => ({ id, type: 'Array', itemType, shape, items: itemIds.map(itemId => store.getNodeValue(itemId)) } as ArrayNode));
    store.saveNode(id, node, dispose);
  });
  return id;
}

/** A number or string gets one hidden node, reused by every call that passes the same value. */
async function resolveArg(arg: Arg, store: NodeStore): Promise<string> {
  if (Array.isArray(arg)) return resolveList(arg, store);
  if (typeof arg === 'object') return arg.id;
  const id = typeof arg === 'number' ? `_literal_num_${arg}` : `_literal_str_${arg}`;
  if (store.getNodeValue(id)) return id;
  if (typeof arg === 'number') {
    return saveLiteral(store, { id, type: 'Scalar', value: scalar(arg) } as ScalarNode);
  }
  return saveLiteral(store, { id, type: 'Text', value: arg } as TextNode);
}

/** Checks `out`, the id asked for the output node of a call with arguments `args`. */
export function checkOut(keyword: string, out: unknown, args: Arg[]) {
  if (out === undefined) return;
  if (typeof out !== 'string' || out === '') {
    throw new Error(`${keyword}: out must be a non-empty string`);
  }
  // Ids starting with '_' are kept for the hidden number and text nodes.
  if (out.startsWith('_')) {
    throw new Error(`${keyword}: out must not start with '_'`);
  }
  // A node that is its own input would update forever.
  if (leaves(args).some(arg => typeof arg === 'object' && arg.id === out)) {
    throw new Error(`${keyword}: out='${out}' is also an input`);
  }
}

/** The keyword arguments of a Python call. */
export interface CallOptions {
  /** The id for the output node. Without it the id is generated. */
  out?: string;
  hidden?: boolean;
  fill?: string;
  stroke?: string;
  /** Only for `animatable` side effects: numbers move to their new values instead of jumping. */
  animate?: boolean;
}

/** `prepare`: runs before an animation the call starts plays. */
export async function execute(store: NodeStore, keyword: string, args: Arg[], { out, hidden, fill, stroke, animate }: CallOptions = {}, prepare?: Prepare): Promise<ExecuteResult> {
  const func = getFunction(keyword) ?? getSideEffect(keyword);
  if (!func) {
    throw new Error(`Unknown function: ${keyword}`);
  }

  const total = func.parameters.length;
  const required = func.parameters.filter(p => p.defaultValue === undefined).length;
  if (args.length < required || args.length > total) {
    const names = func.parameters.map((p: ParameterDefinition) => p.name).join(', ');
    const count = required === total ? `exactly ${total}` : `${required} to ${total}`;
    throw new Error(`${keyword} needs ${count} argument${total === 1 ? '' : 's'} (${names}), got ${args.length}`);
  }
  // Left-out arguments take their defaults. A null default makes no node: `compute` gets undefined.
  const allArgs = func.parameters.map((p, i) => (i < args.length ? args[i] : p.defaultValue!));

  // Check every type and shape first, so a bad call leaves no literal nodes behind.
  const broadcastInputShapes: number[][] = [];
  allArgs.forEach((arg, i) => {
    if (arg === null) return;
    const param = func.parameters[i];
    const types = Array.isArray(param.type) ? param.type : [param.type];
    let got = argType(arg, store);
    // TODO: maybe add `broadcastable` flag to each param instead of the entire func?
    if (isBroadcast(got, param)) {
      if (func.broadcastable === false) throw new Error(`${keyword} does not take arrays`);
      const array = arrayOf(arg, store);
      broadcastInputShapes.push(array.shape);
      // A Mixed array passes when every one of its item types does.
      const itemTypes = array.itemType === 'Mixed' ? itemTypesOf(arg, store) : [array.itemType];
      got = `Array of ${itemTypes.join(', ')}`;
      if (itemTypes.every(type => types.includes(type as NodeType))) return;
    }
    if (!types.includes(got as NodeType)) {
      throw new Error(`${keyword}: expected ${types.join(' or ')} but got ${got} for argument '${param.name}'`);
    }
  });
  if (broadcastInputShapes.length > 0) broadcastShapes(broadcastInputShapes);

  checkOut(keyword, out, args);
  if ('run' in func && hidden !== undefined) throw new Error(`${keyword} does not take hidden`);
  if ('run' in func && fill !== undefined) throw new Error(`${keyword} does not take fill`);
  if ('run' in func && stroke !== undefined) throw new Error(`${keyword} does not take stroke`);
  if (animate !== undefined && !('run' in func && func.animatable)) throw new Error(`${keyword} does not take animate`);
  checkColor(keyword, 'fill', fill);
  checkColor(keyword, 'stroke', stroke);

  const inputNodeIds = await Promise.all(allArgs.map(arg => (arg === null ? undefined : resolveArg(arg, store))));
  const inputs = () => inputNodeIds.map(id => (id === undefined ? undefined : store.getNodeValue(id)!) as AnyNode);

  if ('run' in func) {
    const runs = batch(() => broadcastItems(func.parameters, inputs()).map(itemInputs => func.run(itemInputs, store, animate ?? false)));
    const tracks = runs.filter((run): run is Track => run !== undefined);
    if (tracks.length > 0) await play(tracks, prepare);
    return { id: '', type: 'Dummy' };
  }

  const outputType = broadcastInputShapes.length > 0
    ? 'Array'
    : func.resolveOutputType?.(inputs()) ?? func.outputType;
  const id = out ?? store.nameGenerator.generateAutoName(store.nameGenerator.getPrefixForType(outputType));
  new NodeReconciler().evaluate(func, inputNodeIds, store, id, hidden, fill, stroke);

  const node = store.getNodeValue(id);
  if (node?.type === 'Array') return { id, type: node.type, shape: node.shape, itemType: node.itemType };
  return { id, type: node?.type ?? func.outputType };
}
