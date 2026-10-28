import { batch, onCleanup, onMount } from 'solid-js';
import { NodeStore } from '../state/NodeStore';
import { num, scalar } from '../jax';
import { replaceNode } from '../functions/sideEffects';

type Pixel = { x: number; y: number };

/** A trackpad pinch with a `deltaY` of 100 zooms by a factor of e. */
const PINCH_SPEED = 0.01;
/** Slower than a pinch: a scroll's `deltaY` is larger. */
const SCROLL_SPEED = 0.002;

/**
 * Lets the reader move the canvas with a pointer:
 * - Dragging a point moves it, like `translate_point_to`: it stops following its inputs.
 * - Dragging anywhere else pans the canvas, through `originX` and `originY`.
 * - A pinch, a two-finger trackpad slide or a mouse wheel zooms through `unit`, and moves the origin so the spot
 *   under the cursor or fingers stays put.
 */
export function useCanvasGestures(containerRef: () => HTMLDivElement | undefined, store: NodeStore) {
  // Pointers panning or pinching the canvas.
  const pointers = new Map<number, Pixel>();
  // The pointer dragging a point, and that point's id.
  let drag: { pointerId: number; nodeId: string } | undefined;

  /** Pixels from the canvas's top left. */
  const toPixel = (e: MouseEvent): Pixel => {
    const rect = containerRef()!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /** Sets system scalar `id` to `change(its value)`. Skipped if it is no longer a scalar. */
  const changeScalar = (id: string, change: (value: number) => number) => {
    const node = store.getNodeValue(id);
    if (node?.type === 'Scalar') replaceNode(store, node, { value: scalar(change(num(node.value))) }, false);
  };

  const pan = (dx: number, dy: number) => {
    const unit = store.unit();
    changeScalar('originX', x => x + dx / unit);
    // Pixels go down, grid units go up.
    changeScalar('originY', y => y - dy / unit);
  };

  const zoomAt = (at: Pixel, factor: number) => {
    const unit = store.unit();
    const next = Math.max(1, unit * factor);
    const { width, height } = store.canvasBounds();
    // The spot `at` is a fixed number of pixels from the center; keep it on the same grid position.
    const shift = 1 / next - 1 / unit;
    changeScalar('unit', () => next);
    changeScalar('originX', x => x + (at.x - width / 2) * shift);
    changeScalar('originY', y => y + (height / 2 - at.y) * shift);
  };

  const movePoint = (id: string, at: Pixel) => {
    const point = store.getNodeValue(id);
    // Removed or replaced while being dragged.
    if (point?.type !== 'Point') return;
    const unit = store.unit();
    const origin = store.origin();
    replaceNode(store, point, { x: scalar(at.x / unit - origin.x), y: scalar(origin.y - at.y / unit) }, false);
  };

  /** The pointers' center, and their mean distance from it. */
  const spread = () => {
    const all = [...pointers.values()];
    const x = all.reduce((sum, p) => sum + p.x, 0) / all.length;
    const y = all.reduce((sum, p) => sum + p.y, 0) / all.length;
    const size = all.reduce((sum, p) => sum + Math.hypot(p.x - x, p.y - y), 0) / all.length;
    return { x, y, size };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (drag) return;
    // Keeps text from being selected while dragging with a mouse.
    e.preventDefault();
    containerRef()!.setPointerCapture(e.pointerId);
    const nodeId = (e.target as Element).closest('[data-node-id]')?.getAttribute('data-node-id');
    if (nodeId && pointers.size === 0 && store.getNodeValue(nodeId)?.type === 'Point') {
      drag = { pointerId: e.pointerId, nodeId };
    } else {
      pointers.set(e.pointerId, toPixel(e));
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (drag?.pointerId === e.pointerId) return movePoint(drag.nodeId, toPixel(e));
    if (!pointers.has(e.pointerId)) return;
    const before = spread();
    pointers.set(e.pointerId, toPixel(e));
    const after = spread();
    batch(() => {
      pan(after.x - before.x, after.y - before.y);
      // One pointer has no spread: it only pans.
      if (before.size > 0) zoomAt(after, after.size / before.size);
    });
  };

  const onPointerUp = (e: PointerEvent) => {
    if (drag?.pointerId === e.pointerId) drag = undefined;
    pointers.delete(e.pointerId);
  };

  const onWheel = (e: WheelEvent) => {
    // The browser reports a trackpad pinch as a wheel event with `ctrlKey`, and a scroll as one without.
    e.preventDefault();
    const speed = e.ctrlKey ? PINCH_SPEED : SCROLL_SPEED;
    batch(() => zoomAt(toPixel(e), Math.exp(-e.deltaY * speed)));
  };

  onMount(() => {
    const container = containerRef()!;
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    // Not passive, so `preventDefault` can stop the browser zooming or scrolling the page.
    container.addEventListener('wheel', onWheel, { passive: false });
    onCleanup(() => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
    });
  });
}
