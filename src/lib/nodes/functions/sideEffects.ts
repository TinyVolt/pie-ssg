import { createMemo, createRoot, createSignal, onCleanup } from 'solid-js';
import { SideEffectFunc } from './Node2NodeFunc';
import { AnyNode, PointNode, ScalarNode, TextNode, checkColor, getNodeTypes } from '../state/Node';
import { NodeStore } from '../state/NodeStore';
import { Dtype, add, num, ref, scalar } from '../jax';

/** How long an animated change takes. */
const ANIMATION_MS = 500;

/** Slow at the start and end, fast in the middle. `t` and the result go from 0 to 1. */
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2);

/**
 * Saves `node` with `changes`, new values for some of its numbers, in place of `node`.
 * It has no inputs, so it no longer follows the old node's.
 * With `animate`, the numbers move to their new values over `ANIMATION_MS` instead of jumping.
 * Resolves when they arrive, or when the node is replaced or removed first.
 */
function replaceNode<N extends AnyNode>(store: NodeStore, node: N, changes: Partial<N>, animate: boolean): Promise<void> {
  const { __graph_deps, ...unchanged } = node;
  const end = { ...unchanged, ...changes } as AnyNode;
  if (!animate) {
    createRoot((dispose) => store.saveNode(node.id, createMemo(() => end), dispose));
    return Promise.resolve();
  }

  // [key, start, end] for each changed number.
  const moves = Object.entries(changes).map(([key, value]) => [key, num(node[key as keyof N] as Dtype), num(value)] as const);
  const at = (t: number) => ({ ...end, ...Object.fromEntries(moves.map(([key, a, b]) => [key, scalar(a + (b - a) * t)])) } as AnyNode);

  return new Promise((resolve) => createRoot((dispose) => {
    const start = performance.now();
    const [progress, setProgress] = createSignal(0);
    store.saveNode(node.id, createMemo(() => (progress() < 1 ? at(easeInOut(progress())) : end)), dispose);
    let frame = requestAnimationFrame(function step() {
      setProgress(Math.min((performance.now() - start) / ANIMATION_MS, 1));
      if (progress() < 1) frame = requestAnimationFrame(step);
      else resolve();
    });
    // Another change to this node, or `clear`, disposes this one: stop moving and let the call return.
    onCleanup(() => {
      cancelAnimationFrame(frame);
      resolve();
    });
  }));
}

// Any node, but not a whole Array: an Array is looped over, so each item is hidden or shown.
const anyItem = getNodeTypes().filter(type => type !== 'Array');

/**
 * Hide a node: it is not drawn on the canvas.
 * @param node - Node to hide
 */
export const Hide: SideEffectFunc = {
  keyword: 'hide',
  parameters: [{ name: 'node', type: anyItem }],
  run(inputs, store) {
    store.updateNode(inputs[0].id, { hidden: true });
  },
};

/**
 * Show a hidden node.
 * @param node - Node to show
 */
export const Show: SideEffectFunc = {
  keyword: 'show',
  parameters: [{ name: 'node', type: anyItem }],
  run(inputs, store) {
    store.updateNode(inputs[0].id, { hidden: false });
  },
};

/**
 * Set a node's fill.
 * @param node - Node to change
 * @param color - A CSS color, like 'red' or '#ff0000', or 'none'
 */
export const SetFill: SideEffectFunc = {
  keyword: 'set_fill',
  parameters: [{ name: 'node', type: anyItem }, { name: 'color', type: 'Text' }],
  run(inputs, store) {
    const fill = (inputs[1] as TextNode).value;
    checkColor('set_fill', 'fill', fill);
    store.updateNode(inputs[0].id, { fill });
  },
};

/**
 * Set a node's stroke.
 * @param node - Node to change
 * @param color - A CSS color, like 'red' or '#ff0000', or 'none'
 */
export const SetStroke: SideEffectFunc = {
  keyword: 'set_stroke',
  parameters: [{ name: 'node', type: anyItem }, { name: 'color', type: 'Text' }],
  run(inputs, store) {
    const stroke = (inputs[1] as TextNode).value;
    checkColor('set_stroke', 'stroke', stroke);
    store.updateNode(inputs[0].id, { stroke });
  },
};

/**
 * Clear the canvas and reset the system nodes.
 */
export const Clear: SideEffectFunc = {
  keyword: 'clear',
  parameters: [],
  run(_inputs, store) {
    store.clearNodes();
  },
};

/**
 * Move a point to (x, y). With `animate=True` it moves there over half a second.
 * @param point - Point to move
 * @param x - New x coordinate
 * @param y - New y coordinate
 */
export const TranslatePointTo: SideEffectFunc = {
  keyword: 'translate_point_to',
  parameters: [{ name: 'point', type: 'Point' }, { name: 'x', type: 'Scalar' }, { name: 'y', type: 'Scalar' }],
  animatable: true,
  run(inputs, store, animate) {
    const [point, x, y] = inputs as [PointNode, ScalarNode, ScalarNode];
    return replaceNode(store, point, { x: ref(x.value), y: ref(y.value) }, animate);
  },
};

/**
 * Move a point by (dx, dy). With `animate=True` it moves there over half a second.
 * @param point - Point to move
 * @param dx - Change in x
 * @param dy - Change in y
 */
export const TranslatePointBy: SideEffectFunc = {
  keyword: 'translate_point_by',
  parameters: [{ name: 'point', type: 'Point' }, { name: 'dx', type: 'Scalar' }, { name: 'dy', type: 'Scalar' }],
  animatable: true,
  run(inputs, store, animate) {
    const [point, dx, dy] = inputs as [PointNode, ScalarNode, ScalarNode];
    const x = add(ref(point.x), ref(dx.value));
    const y = add(ref(point.y), ref(dy.value));
    return replaceNode(store, point, { x, y }, animate);
  },
};

/**
 * Set a scalar to a new value. With `animate=True` it gets there over half a second.
 * @param target - Scalar to change
 * @param value - New value
 */
export const TranslateScalarTo: SideEffectFunc = {
  keyword: 'translate_scalar_to',
  parameters: [{ name: 'target', type: 'Scalar' }, { name: 'value', type: 'Scalar' }],
  animatable: true,
  run(inputs, store, animate) {
    const [target, value] = inputs as [ScalarNode, ScalarNode];
    return replaceNode(store, target, { value: ref(value.value) }, animate);
  },
};

/**
 * Add `delta` to a scalar. With `animate=True` it gets there over half a second.
 * @param target - Scalar to change
 * @param delta - Amount to add
 */
export const TranslateScalarBy: SideEffectFunc = {
  keyword: 'translate_scalar_by',
  parameters: [{ name: 'target', type: 'Scalar' }, { name: 'delta', type: 'Scalar' }],
  animatable: true,
  run(inputs, store, animate) {
    const [target, delta] = inputs as [ScalarNode, ScalarNode];
    return replaceNode(store, target, { value: add(ref(target.value), ref(delta.value)) }, animate);
  },
};

/** Docs category for the functions defined in this file. */
export const category = 'Side Effects';
