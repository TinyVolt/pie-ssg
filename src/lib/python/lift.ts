import { createSignal } from 'solid-js';
import { NodeReconciler, PYTHON_KEYWORD_PREFIX, type BlueprintNode, type Node2NodeFunc } from '~/lib/nodes/functions/Node2NodeFunc';
import { checkOut } from '~/lib/nodes/execute';
import type { NodeStore } from '~/lib/nodes/state/NodeStore';
import { checkColor, type AnyNode } from '~/lib/nodes/state/Node';
import { num, scalar } from '~/lib/nodes/jax';

/** The type passed to `pie.lift`: `pie.Scalar`, `pie.Point`, `pie.Text`, or `pie.Array[...]` of `itemType`. */
type Kind = 'Scalar' | 'Point' | 'Text' | 'Array';
type ItemType = 'Scalar' | 'Point';

/** An input node's value as Python gets it: a Scalar's number, a Point's [x, y], a Text's string, or an Array's values in row-major order. */
export type InputValue = number | [number, number] | string | PyResult;

/** A result from Python. `values`: every number in row-major order, a Point as x, y; or a Text's string. A Scalar, Point or Text has shape []. */
export interface PyResult {
  shape: number[];
  values: number[] | [string];
}

/** Sent by Python once `g(a)`, for `g = pie.lift(f, ...)`, has its first result. */
export interface LiftSave extends PyResult {
  id: string;
  name: string;
  inputIds: string[];
  kind: Kind;
  itemType?: ItemType;
  hidden: boolean;
  fill?: string;
  stroke?: string;
}

export type Rerun = (nodeId: string, values: InputValue[], done: (result?: PyResult, error?: string) => void) => void;

/** Before an animation: run node `nodeId`'s lifted function once per entry of `inputs`, one per step. */
export interface BatchJob {
  nodeId: string;
  inputs: InputValue[][];
}

/** The function's result for one entry of a job's `inputs`, or the error it raised. */
export type BatchResult = PyResult | { error: string };

type Blueprint = Record<string, BlueprintNode>;

/** A lifted node's part in an animation. */
interface Animated {
  nodeId: string;
  /** Saves the results for inputs the steps need, by input values. */
  save: (results: Map<string, BatchResult>) => void;
  /** Ends the animation: the node keeps the last step's result, as if a rerun had returned it. */
  end: () => void;
}

// Set while an animation's steps are visited: the inputs each lifted node has no result for, by input values.
let missing: Map<Animated, Map<string, InputValue[]>> | undefined;

function inputValue(node: AnyNode | undefined, id: string): InputValue {
  if (!node) throw new Error(`Unknown node '${id}'`);
  if (node.type === 'Scalar') return num(node.value);
  if (node.type === 'Point') return [num(node.x), num(node.y)];
  if (node.type === 'Text') return node.value;
  if (node.type === 'Array') {
    if (node.itemType === 'Mixed') throw new Error(`'${id}' is an Array of mixed types; an Array input must hold one type`);
    const values = node.items.flatMap(item => inputValue(item, item.id)) as number[];
    return { shape: node.itemType === 'Point' ? [...node.shape, 2] : node.shape, values };
  }
  throw new Error(`'${id}' is a ${node.type}; only Scalar, Point and Text nodes and Arrays of them can be inputs`);
}

/** First half of `g(a)`: checks the inputs, `out`, `fill` and `stroke`, and reserves the output id. Python then calls `f` with `values`. */
export function startLift(store: NodeStore, name: string, inputIds: string[], kind: Kind, out?: string, fill?: string, stroke?: string) {
  const values = inputIds.map(id => inputValue(store.getNodeValue(id), id));
  checkOut(name, out, inputIds.map(id => ({ id })));
  checkColor(name, 'fill', fill);
  checkColor(name, 'stroke', stroke);
  const id = out ?? store.nameGenerator.generateAutoName(store.nameGenerator.getPrefixForType(kind));
  return { id, values };
}

/** Item k of an Array is saved under key `k`, so a rerun with a new shape keeps, adds or removes items by position. */
function toBlueprint(kind: Kind, itemType: ItemType | undefined, result: PyResult): Record<string, BlueprintNode> {
  if (kind === 'Text') return { main: { type: 'Text', value: result.values[0] } };
  const { shape } = result;
  const values = result.values as number[];
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
 * Before an animation: gets every lifted result its steps need from `runBatch`, one trip for all of them.
 * `visitSteps` shows each step, and the lifted nodes note the inputs they have no result for. A result
 * can change the inputs of a lifted node that depends on it, so this repeats until nothing is missing.
 * Returns the function that ends the animation for these nodes. Errors go to the console.
 */
export async function prepareLifts(visitSteps: () => void, runBatch: (jobs: BatchJob[]) => Promise<BatchResult[][]>) {
  const animated = new Set<Animated>();
  for (;;) {
    const found = new Map<Animated, Map<string, InputValue[]>>();
    missing = found;
    try {
      visitSteps();
    } finally {
      missing = undefined;
    }
    if (found.size === 0) return () => animated.forEach(node => node.end());
    const nodes = [...found.keys()];
    const results = await runBatch(nodes.map(node => ({ nodeId: node.nodeId, inputs: [...found.get(node)!.values()] })));
    nodes.forEach((node, i) => {
      const keys = [...found.get(node)!.keys()];
      node.save(new Map(keys.map((key, j) => [key, results[i][j]])));
      animated.add(node);
    });
  }
}

/**
 * Second half of `g(a)`: saves the node with Python's first result. When an input's value changes,
 * the node keeps its value and asks `rerun` for a new one. Rerun errors go to the console.
 * During an animation it shows the results `prepareLifts` got for the steps instead.
 */
export function saveLift(store: NodeStore, save: LiftSave, rerun: Rerun) {
  const { id, name, inputIds, kind, itemType, hidden, fill, stroke } = save;
  const [blueprint, setBlueprint] = createSignal(toBlueprint(kind, itemType, save));
  // The input values of the latest result or rerun request. Unset until the first compute, which uses the first result.
  let requested: string | undefined;
  // During an animation: the results for its steps, by input values. `null`: the function failed for them.
  const steps = new Map<string, Blueprint | null>();
  // The input values of the step shown last.
  let shownStep: string | undefined;

  const animated: Animated = {
    nodeId: id,
    save(results) {
      let error: string | undefined;
      for (const [key, result] of results) {
        if ('error' in result) error ??= result.error;
        steps.set(key, 'error' in result ? null : toBlueprint(kind, itemType, result));
      }
      if (error !== undefined) console.error(`${name}: ${error}`);
    },
    end() {
      if (shownStep === undefined) return;
      const shown = steps.get(shownStep);
      requested = shownStep;
      shownStep = undefined;
      steps.clear();
      if (shown) setBlueprint(shown);
    },
  };

  const func: Node2NodeFunc = {
    keyword: `${PYTHON_KEYWORD_PREFIX}${name}`,
    outputType: kind,
    // 'Array' too, so `computeBlueprint` passes an Array input whole instead of looping over it.
    parameters: inputIds.map((_, i) => ({ name: `input${i}`, type: ['Scalar', 'Point', 'Text', 'Array'] })),
    broadcastable: false,
    compute(inputs) {
      const values = inputs.map((node, i) => inputValue(node, inputIds[i]));
      const key = JSON.stringify(values);
      if (missing || steps.has(key)) {
        const step = steps.get(key);
        if (step === undefined) noteMissing(animated, key, values);
        else shownStep = key;
        return step ?? blueprint();
      }
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
  new NodeReconciler().evaluate(func, inputIds, store, id, hidden, fill, stroke);
}

function noteMissing(node: Animated, key: string, values: InputValue[]) {
  let inputs = missing!.get(node);
  if (!inputs) missing!.set(node, inputs = new Map());
  inputs.set(key, values);
}
