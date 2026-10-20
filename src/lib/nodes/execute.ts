import { createMemo, createRoot } from 'solid-js';
import { getFunction } from './functions/registry';
import { NodeReconciler, ParameterDefinition } from './functions/Node2NodeFunc';
import { NodeStore } from './state/NodeStore';
import { AnyNode, ArrayNode, NodeType, ScalarNode, TextNode } from './state/Node';
import { scalar } from './jax';
import { leaves, listItemType, listShape, sha256 } from './tensors/tensor';
import { broadcastShapes, isBroadcast } from './tensors/broadcast';

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
function arrayOf(arg: Arg, store: NodeStore): { itemType: NodeType; shape: number[] } {
  if (Array.isArray(arg)) return { itemType: listItemType(arg, item => argType(item, store)), shape: listShape(arg) };
  return store.getNodeValue((arg as { id: string }).id) as ArrayNode;
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

/** `out` is the id for the output node. Without it the id is generated. */
export async function execute(store: NodeStore, keyword: string, args: Arg[], out?: string): Promise<ExecuteResult> {
  const func = getFunction(keyword);
  if (!func) {
    throw new Error(`Unknown function: ${keyword}`);
  }

  const expected = func.parameters.length;
  if (args.length !== expected) {
    const names = func.parameters.map((p: ParameterDefinition) => p.name).join(', ');
    throw new Error(`${keyword} needs exactly ${expected} argument${expected === 1 ? '' : 's'} (${names}), got ${args.length}`);
  }

  // Check every type and shape first, so a bad call leaves no literal nodes behind.
  const broadcastInputShapes: number[][] = [];
  args.forEach((arg, i) => {
    const param = func.parameters[i];
    const types = Array.isArray(param.type) ? param.type : [param.type];
    let got = argType(arg, store);
    // TODO: maybe add `broadcastable` flag to each param instead of the entire func?
    if (isBroadcast(got, param)) {
      if (func.broadcastable === false) throw new Error(`${keyword} does not take arrays`);
      const array = arrayOf(arg, store);
      broadcastInputShapes.push(array.shape);
      got = `Array of ${array.itemType}`;
      if (types.includes(array.itemType)) return;
    }
    if (!types.includes(got as NodeType)) {
      throw new Error(`${keyword}: expected ${types.join(' or ')} but got ${got} for argument '${param.name}'`);
    }
  });
  if (broadcastInputShapes.length > 0) broadcastShapes(broadcastInputShapes);

  checkOut(keyword, out, args);

  const inputNodeIds = await Promise.all(args.map(arg => resolveArg(arg, store)));

  const outputType = broadcastInputShapes.length > 0
    ? 'Array'
    : func.resolveOutputType?.(inputNodeIds.map(id => store.getNodeValue(id)!)) ?? func.outputType;
  const id = out ?? store.nameGenerator.generateAutoName(store.nameGenerator.getPrefixForType(outputType));
  new NodeReconciler().evaluate(func, inputNodeIds, store, id);

  const node = store.getNodeValue(id);
  if (node?.type === 'Array') return { id, type: node.type, shape: node.shape, itemType: node.itemType };
  return { id, type: node?.type ?? func.outputType };
}
