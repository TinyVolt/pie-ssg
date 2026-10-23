import type { BlueprintNode, Node2NodeFunc, ParameterDefinition } from '../functions/Node2NodeFunc';
import { AnyNode, ArrayNode, DummyNode } from '../state/Node';

const DUMMY: DummyNode = { id: '', type: 'Dummy' };

/** Whether an input of type `type` is looped over: an array going to a parameter that doesn't take whole arrays. */
export function isBroadcast(type: string, param: ParameterDefinition): boolean {
  const types = Array.isArray(param.type) ? param.type : [param.type];
  return type === 'Array' && !types.includes('Array');
}

const formatShape = (shape: number[]) => `(${shape.join(', ')}${shape.length === 1 ? ',' : ''})`;

/** numpy broadcasting: shapes are lined up from the right, and each dimension must match or be 1. */
export function broadcastShapes(shapes: number[][]): number[] {
  const ndim = Math.max(...shapes.map(shape => shape.length));
  const result: number[] = [];
  for (let d = 0; d < ndim; d++) {
    let size = 1;
    for (const shape of shapes) {
      const dim = shape[d - ndim + shape.length] ?? 1;
      if (dim === 1) continue;
      if (size !== 1 && size !== dim) {
        throw new Error(`shapes ${shapes.map(formatShape).join(' and ')} can't be broadcast together`);
      }
      size = dim;
    }
    result.push(size);
  }
  return result;
}

/** Row-major position `flat` as one index per dimension of `shape`. */
function unravel(flat: number, shape: number[]): number[] {
  const index: number[] = [];
  for (let d = shape.length - 1; d >= 0; d--) {
    index[d] = flat % shape[d];
    flat = Math.floor(flat / shape[d]);
  }
  return index;
}

/** The row-major position in an array of `shape` that broadcast output index `index` reads. */
function sourceIndex(shape: number[], index: number[]): number {
  const offset = index.length - shape.length;
  return shape.reduce((flat, dim, d) => flat * dim + (dim === 1 ? 0 : index[d + offset]), 0);
}

/**
 * The inputs of each item when an input is broadcast (see `isBroadcast`), or just `inputs`
 * when none is. Like `computeBlueprint`, an item with a Dummy input is skipped.
 */
export function broadcastItems(parameters: ParameterDefinition[], inputs: AnyNode[]): AnyNode[][] {
  // An input is undefined for a left-out optional parameter.
  const broadcasts = inputs.map((node, i) => node !== undefined && isBroadcast(node.type, parameters[i]));
  if (!broadcasts.includes(true)) return [inputs];

  const shapes = inputs.map((node, i) => broadcasts[i] ? (node as ArrayNode).shape : []);
  const shape = broadcastShapes(shapes);
  const size = shape.reduce((a, b) => a * b, 1);

  const items: AnyNode[][] = [];
  for (let k = 0; k < size; k++) {
    const index = unravel(k, shape);
    const itemInputs = inputs.map((node, i) => broadcasts[i] ? (node as ArrayNode).items[sourceIndex(shapes[i], index)] : node);
    if (!itemInputs.some(node => node?.type === 'Dummy')) items.push(itemInputs);
  }
  return items;
}

/**
 * `func.compute`, run once per item when an input is broadcast (see `isBroadcast`).
 * Item k's nodes are saved under keys `k.main`, `k.l_0`, ..., and `main` is the array of
 * every item's main node. An item is Dummy, and not saved, when one of its inputs is
 * Dummy or its own main node is.
 */
export function computeBlueprint(func: Node2NodeFunc, inputs: AnyNode[]): Record<string, BlueprintNode> {
  // An input is undefined for a left-out optional parameter.
  const broadcasts = inputs.map((node, i) => node !== undefined && isBroadcast(node.type, func.parameters[i]));
  if (!broadcasts.includes(true)) return func.compute(inputs);

  const shapes = inputs.map((node, i) => broadcasts[i] ? (node as ArrayNode).shape : []);
  const shape = broadcastShapes(shapes);
  const size = shape.reduce((a, b) => a * b, 1);

  const blueprint: Record<string, BlueprintNode> = {};
  const items: BlueprintNode[] = [];
  for (let k = 0; k < size; k++) {
    const index = unravel(k, shape);
    const itemInputs = inputs.map((node, i) => broadcasts[i] ? (node as ArrayNode).items[sourceIndex(shapes[i], index)] : node);
    const item = itemInputs.some(node => node?.type === 'Dummy') ? { main: DUMMY } : func.compute(itemInputs);
    if (item.main.type === 'Dummy') {
      items.push(DUMMY);
      continue;
    }
    for (const key in item) blueprint[`${k}.${key}`] = item[key];
    items.push(item.main);
  }
  blueprint.main = { type: 'Array', itemType: func.outputType, shape, items };
  return blueprint;
}
