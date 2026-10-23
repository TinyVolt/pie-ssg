import { createMemo, createRoot } from 'solid-js';
import { SideEffectFunc } from './Node2NodeFunc';
import { AnyNode, PointNode, ScalarNode, TextNode, checkColor, getNodeTypes } from '../state/Node';
import { NodeStore } from '../state/NodeStore';
import { add, ref } from '../jax';

/** Saves `node` in place of the node with the same id. It has no inputs, so it no longer follows the old node's. */
function replaceNode(store: NodeStore, node: AnyNode) {
  createRoot((dispose) => {
    store.saveNode(node.id, createMemo(() => node), dispose);
  });
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
 * Move a point to (x, y).
 * @param point - Point to move
 * @param x - New x coordinate
 * @param y - New y coordinate
 */
export const TranslatePointTo: SideEffectFunc = {
  keyword: 'translate_point_to',
  parameters: [{ name: 'point', type: 'Point' }, { name: 'x', type: 'Scalar' }, { name: 'y', type: 'Scalar' }],
  run(inputs, store) {
    const [point, x, y] = inputs as [PointNode, ScalarNode, ScalarNode];
    replaceNode(store, { id: point.id, type: 'Point', hidden: point.hidden, fill: point.fill, stroke: point.stroke, x: ref(x.value), y: ref(y.value) });
  },
};

/**
 * Move a point by (dx, dy).
 * @param point - Point to move
 * @param dx - Change in x
 * @param dy - Change in y
 */
export const TranslatePointBy: SideEffectFunc = {
  keyword: 'translate_point_by',
  parameters: [{ name: 'point', type: 'Point' }, { name: 'dx', type: 'Scalar' }, { name: 'dy', type: 'Scalar' }],
  run(inputs, store) {
    const [point, dx, dy] = inputs as [PointNode, ScalarNode, ScalarNode];
    const x = add(ref(point.x), ref(dx.value));
    const y = add(ref(point.y), ref(dy.value));
    replaceNode(store, { id: point.id, type: 'Point', hidden: point.hidden, fill: point.fill, stroke: point.stroke, x, y });
  },
};

/**
 * Set a scalar to a new value.
 * @param target - Scalar to change
 * @param value - New value
 */
export const TranslateScalarTo: SideEffectFunc = {
  keyword: 'translate_scalar_to',
  parameters: [{ name: 'target', type: 'Scalar' }, { name: 'value', type: 'Scalar' }],
  run(inputs, store) {
    const [target, value] = inputs as [ScalarNode, ScalarNode];
    replaceNode(store, { id: target.id, type: 'Scalar', value: ref(value.value) });
  },
};

/**
 * Add `delta` to a scalar.
 * @param target - Scalar to change
 * @param delta - Amount to add
 */
export const TranslateScalarBy: SideEffectFunc = {
  keyword: 'translate_scalar_by',
  parameters: [{ name: 'target', type: 'Scalar' }, { name: 'delta', type: 'Scalar' }],
  run(inputs, store) {
    const [target, delta] = inputs as [ScalarNode, ScalarNode];
    replaceNode(store, { id: target.id, type: 'Scalar', value: add(ref(target.value), ref(delta.value)) });
  },
};

/** Docs category for the functions defined in this file. */
export const category = 'Side Effects';
