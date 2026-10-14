import { createSignal, Show, type JSX } from 'solid-js';
import { NodeCanvas } from '~/lib/nodes/components/NodeCanvas';
import { NodeStore } from '~/lib/nodes/state/NodeStore';
import type { CanvasSide } from '../frontmatter';

type Side = Exclude<CanvasSide, 'none'>;
type Direction = 'left' | 'right' | 'up' | 'down';

const MIN_PERCENT = 15;
const MAX_PERCENT = 80;
const SNAP_PERCENT = 8;

const CANVAS_DIRECTION: Record<Side, Direction> = { left: 'left', right: 'right', top: 'up', bottom: 'down' };
const OPPOSITE: Record<Direction, Direction> = { left: 'right', right: 'left', up: 'down', down: 'up' };
const BUTTONS_TRANSFORM: Record<Direction | 'center', string> = {
  center: 'translate(-50%, -50%)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
  up: 'translate(-50%, -100%)',
  down: 'translate(-50%, 0)',
};
const CHEVRON_TURN: Record<Direction, number> = { left: 0, up: 90, right: 180, down: 270 };

const HIDDEN_PANEL: JSX.CSSProperties = { flex: '0 0 0%', overflow: 'hidden', visibility: 'hidden' };

function Chevron(props: { direction: Direction }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={{ transform: `rotate(${CHEVRON_TURN[props.direction]}deg)` }}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/** A canvas on `side` of the page's text, split by a draggable divider with collapse buttons. */
export function CanvasPage(props: { side: Side; html: string }) {
  let wrapperRef: HTMLDivElement | undefined;
  const store = new NodeStore();

  // The text's share of the page, in %.
  const [textPercent, setTextPercent] = createSignal(50);
  const [collapsed, setCollapsed] = createSignal<'none' | 'canvas' | 'text'>('none');

  const isStacked = () => props.side === 'top' || props.side === 'bottom';
  const canvasDirection = () => CANVAS_DIRECTION[props.side];
  const textDirection = () => OPPOSITE[canvasDirection()];

  const startResize = (e: PointerEvent) => {
    e.preventDefault();
    document.body.style.userSelect = 'none';
    const move = (ev: PointerEvent) => {
      const rect = wrapperRef?.getBoundingClientRect();
      if (!rect) return;
      const fraction = {
        left: (rect.right - ev.clientX) / rect.width,
        right: (ev.clientX - rect.left) / rect.width,
        top: (rect.bottom - ev.clientY) / rect.height,
        bottom: (ev.clientY - rect.top) / rect.height,
      }[props.side];
      const pct = fraction * 100;
      if (pct < SNAP_PERCENT) {
        setCollapsed('text');
      } else if (pct > 100 - SNAP_PERCENT) {
        setCollapsed('canvas');
      } else {
        setCollapsed('none');
        setTextPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, pct)));
      }
    };
    const stop = () => {
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const canvasStyle = () => (collapsed() === 'canvas' ? HIDDEN_PANEL : undefined);
  const textStyle = (): JSX.CSSProperties => {
    const c = collapsed();
    if (c === 'text') return HIDDEN_PANEL;
    if (c === 'canvas') return { flex: '1 1 0%' };
    return { flex: `0 0 ${textPercent()}%` };
  };
  const buttonsTransform = () => {
    const c = collapsed();
    return BUTTONS_TRANSFORM[c === 'canvas' ? textDirection() : c === 'text' ? canvasDirection() : 'center'];
  };

  return (
    <div class={`canvas-page canvas-page--${props.side}`} ref={wrapperRef}>
      <div class="canvas-page-canvas" style={canvasStyle()}>
        <NodeCanvas store={store} />
      </div>

      <div
        class="canvas-page-resizer"
        classList={{ 'canvas-page-resizer--horizontal': isStacked() }}
        onPointerDown={startResize}
        role="separator"
        aria-orientation={isStacked() ? 'horizontal' : 'vertical'}
      >
        <div class="canvas-page-resizer-buttons" style={{ transform: buttonsTransform() }}>
          <Show when={collapsed() !== 'canvas'}>
            <button
              class="canvas-page-resizer-button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setCollapsed(collapsed() === 'text' ? 'none' : 'canvas')}
              aria-label={collapsed() === 'text' ? 'Show text' : 'Hide canvas'}
              title={collapsed() === 'text' ? 'Show text' : 'Hide canvas'}
            >
              <Chevron direction={canvasDirection()} />
            </button>
          </Show>
          <Show when={collapsed() !== 'text'}>
            <button
              class="canvas-page-resizer-button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setCollapsed(collapsed() === 'canvas' ? 'none' : 'text')}
              aria-label={collapsed() === 'canvas' ? 'Show canvas' : 'Hide text'}
              title={collapsed() === 'canvas' ? 'Show canvas' : 'Hide text'}
            >
              <Chevron direction={textDirection()} />
            </button>
          </Show>
        </div>
      </div>

      <main class="canvas-page-text" style={textStyle()} innerHTML={props.html} />
    </div>
  );
}
