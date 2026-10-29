/** Class of the layer over the canvas that holds the UIs dropped there. */
export const UI_LAYER_CLASS = 'canvas-ui-layer';

/** Pixels the pointer must move before a press on the grip becomes a drag. */
const DRAG_THRESHOLD = 4;
/** Within this many pixels of the text's visible top or bottom, a drag scrolls the text. */
const SCROLL_EDGE = 40;
const SCROLL_STEP = 10;

type Pixel = { x: number; y: number };

const inside = (r: DOMRect, p: Pixel) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;

/** Keeps `box` inside `layer`, with its top left corner at (`left`, `top`) if that fits. */
export function clampToLayer(box: HTMLElement, layer: HTMLElement, left = box.offsetLeft, top = box.offsetTop) {
  const maxLeft = Math.max(0, layer.clientWidth - box.offsetWidth);
  const maxTop = Math.max(0, layer.clientHeight - box.offsetHeight);
  box.style.left = `${Math.min(Math.max(0, left), maxLeft)}px`;
  box.style.top = `${Math.min(Math.max(0, top), maxTop)}px`;
}

/** The gap between the blocks of `text` nearest to height `y`: the block it sits before (null: the end) and its height. */
function nearestGap(text: HTMLElement, box: HTMLElement, y: number): { before: Element | null; y: number } {
  // Hidden blocks have no box, so their position means nothing.
  const blocks = [...text.children].filter((block) => block !== box && block.getClientRects().length > 0);
  const rects = blocks.map((block) => block.getBoundingClientRect());
  if (rects.length === 0) return { before: null, y: text.getBoundingClientRect().top };
  let best = { before: blocks[0] as Element | null, y: rects[0].top };
  for (let i = 1; i <= rects.length; i++) {
    const gapY = i === rects.length ? rects[i - 1].bottom : (rects[i - 1].bottom + rects[i].top) / 2;
    if (Math.abs(gapY - y) < Math.abs(best.y - y)) best = { before: blocks[i] ?? null, y: gapY };
  }
  return best;
}

/** The nearest ancestor of `el` that scrolls, or the page. */
function scrollParent(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === 'auto' || overflowY === 'scroll') return p;
  }
  return document.scrollingElement as HTMLElement;
}

/**
 * Drags `box`, a UI, from a press `e` on its grip. Dropped over the canvas, it stays at that spot on the screen.
 * Dropped anywhere else, it goes into the nearest gap between the blocks of `text`, the page's text.
 * Near the text's top or bottom edge, the text scrolls.
 */
export function dragUi(e: PointerEvent, box: HTMLElement, text: HTMLElement) {
  if (e.button !== 0) return;
  e.preventDefault();
  const layer = document.querySelector<HTMLElement>(`.${UI_LAYER_CLASS}`);
  const scroller = scrollParent(text);
  const rect = box.getBoundingClientRect();
  // Where the pointer holds the box, so the box doesn't jump under it.
  const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  const start = { x: e.clientX, y: e.clientY };
  let pointer = start;
  let dragging = false;
  let frame = 0;
  const line = document.createElement('div');
  line.className = 'python-editor-ui-drop-line';

  const overLayer = () => layer !== null && inside(layer.getBoundingClientRect(), pointer);

  const update = () => {
    box.style.left = `${pointer.x - offset.x}px`;
    box.style.top = `${pointer.y - offset.y}px`;
    if (overLayer()) return line.remove();
    const textRect = text.getBoundingClientRect();
    line.style.left = `${textRect.left}px`;
    line.style.width = `${textRect.width}px`;
    line.style.top = `${nearestGap(text, box, pointer.y).y}px`;
    if (!line.isConnected) document.body.append(line);
  };

  const autoScroll = () => {
    if (!overLayer()) {
      const edges = scroller === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
      const step = pointer.y < edges.top + SCROLL_EDGE ? -SCROLL_STEP : pointer.y > edges.bottom - SCROLL_EDGE ? SCROLL_STEP : 0;
      if (step !== 0) {
        scroller.scrollTop += step;
        update();
      }
    }
    frame = requestAnimationFrame(autoScroll);
  };

  // The box floats under the pointer, above everything, until it is dropped.
  const begin = () => {
    dragging = true;
    document.body.style.userSelect = 'none';
    box.classList.add('python-editor-ui-dragging');
    box.style.position = 'fixed';
    document.body.append(box);
    frame = requestAnimationFrame(autoScroll);
  };

  const move = (ev: PointerEvent) => {
    pointer = { x: ev.clientX, y: ev.clientY };
    if (!dragging) {
      if (Math.hypot(pointer.x - start.x, pointer.y - start.y) < DRAG_THRESHOLD) return;
      begin();
    }
    update();
  };

  const drop = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', drop);
    window.removeEventListener('pointercancel', drop);
    if (!dragging) return;
    cancelAnimationFrame(frame);
    document.body.style.userSelect = '';
    line.remove();
    box.classList.remove('python-editor-ui-dragging');
    if (layer && overLayer()) {
      const boxRect = box.getBoundingClientRect();
      const layerRect = layer.getBoundingClientRect();
      layer.append(box);
      box.style.position = 'absolute';
      clampToLayer(box, layer, boxRect.left - layerRect.left, boxRect.top - layerRect.top);
    } else {
      box.style.position = box.style.left = box.style.top = '';
      text.insertBefore(box, nearestGap(text, box, pointer.y).before);
    }
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', drop);
  window.addEventListener('pointercancel', drop);
}
