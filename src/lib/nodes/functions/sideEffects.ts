import { createMemo, createRoot } from 'solid-js';
import { SideEffectFunc } from './Node2NodeFunc';
import { AnyNode, PointNode, ScalarNode } from '../state/Node';
import { NodeStore } from '../state/NodeStore';
import { add, ref } from '../jax';

/** Saves `node` in place of the node with the same id. It has no inputs, so it no longer follows the old node's. */
function replaceNode(store: NodeStore, node: AnyNode) {
  createRoot((dispose) => {
    store.saveNode(node.id, createMemo(() => node), dispose);
  });
}

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
    replaceNode(store, { id: point.id, type: 'Point', x: ref(x.value), y: ref(y.value) });
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
    replaceNode(store, { id: point.id, type: 'Point', x, y });
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
