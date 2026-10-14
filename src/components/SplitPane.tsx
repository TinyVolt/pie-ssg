import { createSignal, Show, type JSX } from 'solid-js';
import { Chevron, type Direction } from './icons';

/** The edge the first pane sits against. */
export type SplitSide = 'left' | 'right' | 'top' | 'bottom';
type Collapsed = 'none' | 'first' | 'second';

// Limits on the first pane's share, in %, while dragging.
const MIN_PERCENT = 20;
const MAX_PERCENT = 85;
/** Dragging a pane below this share, in %, collapses it. */
const SNAP_PERCENT = 8;

const SIDE_DIRECTION: Record<SplitSide, Direction> = { left: 'left', right: 'right', top: 'up', bottom: 'down' };
const OPPOSITE: Record<Direction, Direction> = { left: 'right', right: 'left', up: 'down', down: 'up' };
const BUTTONS_TRANSFORM: Record<Direction | 'center', string> = {
  center: 'translate(-50%, -50%)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
  up: 'translate(-50%, -100%)',
  down: 'translate(-50%, 0)',
};

const HIDDEN_PANE: JSX.CSSProperties = { flex: '0 0 0%', overflow: 'hidden', visibility: 'hidden' };

/** The first pane's share of `rect`, in %, with the pointer at (`x`, `y`). */
function firstPercentAt(side: SplitSide, rect: DOMRect, x: number, y: number): number {
  const fraction = {
    left: (x - rect.left) / rect.width,
    right: (rect.right - x) / rect.width,
    top: (y - rect.top) / rect.height,
    bottom: (rect.bottom - y) / rect.height,
  }[side];
  return fraction * 100;
}

/**
 * Calls `onMove` on every pointer move until the pointer is released.
 * Listens on the window, so the drag goes on after the pointer leaves the divider.
 * Text selection is off meanwhile, so dragging doesn't highlight page text.
 */
function trackDrag(onMove: (ev: PointerEvent) => void) {
  document.body.style.userSelect = 'none';
  const stop = () => {
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', stop);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', stop);
}

/** The draggable bar between the panes, with a button to collapse each one. */
function SplitDivider(props: {
  side: SplitSide;
  collapsed: Collapsed;
  setCollapsed: (c: Collapsed) => void;
  firstLabel: string;
  secondLabel: string;
  onPointerDown: (e: PointerEvent) => void;
}) {
  const isStacked = () => props.side === 'top' || props.side === 'bottom';
  const firstDirection = () => SIDE_DIRECTION[props.side];
  const secondDirection = () => OPPOSITE[firstDirection()];
  // A collapsed pane's buttons sit beside the bar, on the open pane's side.
  const buttonsTransform = () => {
    const c = props.collapsed;
    return BUTTONS_TRANSFORM[c === 'first' ? secondDirection() : c === 'second' ? firstDirection() : 'center'];
  };
  const firstButtonLabel = () => (props.collapsed === 'second' ? `Show ${props.secondLabel}` : `Hide ${props.firstLabel}`);
  const secondButtonLabel = () => (props.collapsed === 'first' ? `Show ${props.firstLabel}` : `Hide ${props.secondLabel}`);

  return (
    <div
      class="split-pane-divider"
      classList={{ 'split-pane-divider--horizontal': isStacked() }}
      onPointerDown={props.onPointerDown}
      role="separator"
      aria-orientation={isStacked() ? 'horizontal' : 'vertical'}
    >
      <div class="split-pane-buttons" style={{ transform: buttonsTransform() }}>
        <Show when={props.collapsed !== 'first'}>
          <button
            class="split-pane-button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => props.setCollapsed(props.collapsed === 'second' ? 'none' : 'first')}
            aria-label={firstButtonLabel()}
            title={firstButtonLabel()}
          >
            <Chevron direction={firstDirection()} />
          </button>
        </Show>
        <Show when={props.collapsed !== 'second'}>
          <button
            class="split-pane-button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => props.setCollapsed(props.collapsed === 'first' ? 'none' : 'second')}
            aria-label={secondButtonLabel()}
            title={secondButtonLabel()}
          >
            <Chevron direction={secondDirection()} />
          </button>
        </Show>
      </div>
    </div>
  );
}

export interface SplitPaneProps {
  side: SplitSide;
  first: JSX.Element;
  second: JSX.Element;
  /** Names used on the collapse buttons, e.g. "Hide canvas". */
  firstLabel: string;
  secondLabel: string;
  class?: string;
}

/**
 * Two panes split by a draggable divider: `first` against `side`, `second` in the rest.
 * Each pane can be collapsed with a button on the divider, or by dragging it nearly shut.
 */
export function SplitPane(props: SplitPaneProps) {
  let ref: HTMLDivElement | undefined;
  const [firstPercent, setFirstPercent] = createSignal(50);
  const [collapsed, setCollapsed] = createSignal<Collapsed>('none');

  const startResize = (e: PointerEvent) => {
    e.preventDefault();
    trackDrag((ev) => {
      if (!ref) return;
      const pct = firstPercentAt(props.side, ref.getBoundingClientRect(), ev.clientX, ev.clientY);
      if (pct < SNAP_PERCENT) {
        setCollapsed('first');
      } else if (pct > 100 - SNAP_PERCENT) {
        setCollapsed('second');
      } else {
        setCollapsed('none');
        setFirstPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, pct)));
      }
    });
  };

  const firstStyle = (): JSX.CSSProperties => {
    const c = collapsed();
    if (c === 'first') return HIDDEN_PANE;
    if (c === 'second') return { flex: '1 1 0%' };
    return { flex: `0 0 ${firstPercent()}%` };
  };
  const secondStyle = (): JSX.CSSProperties => (collapsed() === 'second' ? HIDDEN_PANE : { flex: '1 1 0%' });

  return (
    <div class={`split-pane split-pane--${props.side} ${props.class ?? ''}`} ref={ref}>
      <div class="split-pane-pane" style={firstStyle()}>
        {props.first}
      </div>
      <SplitDivider
        side={props.side}
        collapsed={collapsed()}
        setCollapsed={setCollapsed}
        firstLabel={props.firstLabel}
        secondLabel={props.secondLabel}
        onPointerDown={startResize}
      />
      <div class="split-pane-pane" style={secondStyle()}>
        {props.second}
      </div>
    </div>
  );
}
