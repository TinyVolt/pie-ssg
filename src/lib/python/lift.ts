import { createSignal } from 'solid-js';
import { NodeReconciler, PYTHON_KEYWORD_PREFIX, type BlueprintNode, type Node2NodeFunc } from '~/lib/nodes/functions/Node2NodeFunc';
import { checkOut } from '~/lib/nodes/execute';
import type { NodeStore } from '~/lib/nodes/state/NodeStore';
import type { AnyNode } from '~/lib/nodes/state/Node';
import { num, scalar } from '~/lib/nodes/jax';

/** The type passed to `pie.lift`: `pie.Scalar`, `pie.Point`, or `pie.Array[...]` of `itemType`. */
type Kind = 'Scalar' | 'Point' | 'Array';
type ItemType = 'Scalar' | 'Point';

/** An input node's value as Python gets it: a Scalar's number, or a Point's [x, y]. */
export type InputValue = number | [number, number];

/** A result from Python. `values`: every number in row-major order, a Point as x, y. A Scalar or Point has shape []. */
export interface PyResult {
  shape: number[];
  values: number[];
}

/** Sent by Python once `g(a)`, for `g = pie.lift(f, ...)`, has its first result. */
export interface LiftSave extends PyResult {
  id: string;
  name: string;
  inputIds: string[];
  kind: Kind;
  itemType?: ItemType;
  hidden: boolean;
}

export type Rerun = (nodeId: string, values: InputValue[], done: (result?: PyResult, error?: string) => void) => void;

function inputValue(node: AnyNode | undefined, id: string): InputValue {
  if (!node) throw new Error(`Unknown node '${id}'`);
  if (node.type === 'Scalar') return num(node.value);
  if (node.type === 'Point') return [num(node.x), num(node.y)];
  throw new Error(`'${id}' is a ${node.type}; only Scalar and Point nodes can be inputs`);
}

/** First half of `g(a)`: checks the inputs and `out`, and reserves the output id. Python then calls `f` with `values`. */
export function startLift(store: NodeStore, name: string, inputIds: string[], kind: Kind, out?: string) {
  const values = inputIds.map(id => inputValue(store.getNodeValue(id), id));
  checkOut(name, out, inputIds.map(id => ({ id })));
  const id = out ?? store.nameGenerator.generateAutoName(store.nameGenerator.getPrefixForType(kind));
  return { id, values };
}

/** Item k of an Array is saved under key `k`, so a rerun with a new shape keeps, adds or removes items by position. */
function toBlueprint(kind: Kind, itemType: ItemType | undefined, { shape, values }: PyResult): Record<string, BlueprintNode> {
  const item = (type: ItemType, k: number) => type === 'Point'
    ? { type: 'Point', x: scalar(values[2 * k]), y: scalar(values[2 * k + 1]) }
    : { type: 'Scalar', value: scalar(values[k]) };
  if (kind !== 'Array') return { main: item(kind, 0) };
  const blueprint: Record<string, BlueprintNode> = {};
  const items: BlueprintNode[] = [];
  const size = shape.reduce((a, b) => a * b, 1);
  for (let k = 0; k < size; k++) items.push(blueprint[k] = item(itemType!, k));
  blueprint.main = { type: 'Array', itemType, shape, items };
  return blueprint;
}

/**
 * Second half of `g(a)`: saves the node with Python's first result. When an input's value changes,
 * the node keeps its value and asks `rerun` for a new one. Rerun errors go to the console.
 */
export function saveLift(store: NodeStore, save: LiftSave, rerun: Rerun) {
  const { id, name, inputIds, kind, itemType, hidden } = save;
  const [blueprint, setBlueprint] = createSignal(toBlueprint(kind, itemType, save));
  // The input values of the latest result or rerun request. Unset until the first compute, which uses the first result.
  let requested: string | undefined;

  const func: Node2NodeFunc = {
    keyword: `${PYTHON_KEYWORD_PREFIX}${name}`,
    outputType: kind,
    // 'Array' too, so `computeBlueprint` passes an Array input whole, for `inputValue` to reject, instead of looping over it.
    parameters: inputIds.map((_, i) => ({ name: `input${i}`, type: ['Scalar', 'Point', 'Array'] })),
    broadcastable: false,
    compute(inputs) {
      const values = inputs.map((node, i) => inputValue(node, inputIds[i]));
      const key = JSON.stringify(values);
      if (requested !== undefined && key !== requested) {
        rerun(id, values, (result, error) => {
          if (error !== undefined) console.error(`${name}: ${error}`);
          // A reply for an older request is dropped.
          else if (key === requested) setBlueprint(toBlueprint(kind, itemType, result!));
        });
      }
      requested = key;
      return blueprint();
    },
  };
  new NodeReconciler().evaluate(func, inputIds, store, id, hidden);
}
