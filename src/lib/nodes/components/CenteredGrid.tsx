import { JSX, createMemo, Show } from 'solid-js';
import { MIN_GRID_UNIT } from '../state/NodeStore';

interface CenteredGridProps {
  /** Canvas size in viewBox units. */
  width: number;
  height: number;
  /** Pixels per grid unit. */
  unit: number;
  /** Opacity multiplier for the grid lines and axes (0 hides them). Defaults to 1. */
  gridOpacity?: number;
  /** Solid fill painted behind the grid. Defaults to transparent (no rect). */
  backgroundColor?: string;
  /** Position of the origin in the viewBox. Defaults to the center of the canvas. */
  origin?: { x: number; y: number };
  children: JSX.Element;
}

const GRID_OPACITY = 0.15;
const AXIS_OPACITY = 0.4;

export function CenteredGrid(props: CenteredGridProps) {
  const originX = () => props.origin?.x ?? props.width / 2;
  const originY = () => props.origin?.y ?? props.height / 2;

  // Local (post-transform) extents of the canvas relative to the origin.
  const extents = createMemo(() => ({
    xLeft: -originX(),
    xRight: props.width - originX(),
    yBottom: -(props.height - originY()),
    yTop: originY(),
  }));

  const gridLines = createMemo(() => {
    const lines: JSX.Element[] = [];
    const { xLeft, xRight, yBottom, yTop } = extents();

    if (props.unit >= MIN_GRID_UNIT) {
      // Vertical lines (every 1 unit)
      for (let x = Math.ceil(xLeft); x <= Math.floor(xRight); x += 1) {
        if (x === 0) continue;
        lines.push(<line x1={x} y1={yBottom} x2={x} y2={yTop} stroke="currentColor" stroke-width={1 / props.unit} opacity={GRID_OPACITY} />);
      }

      // Horizontal lines (every 1 unit)
      for (let y = Math.ceil(yBottom); y <= Math.floor(yTop); y += 1) {
        if (y === 0) continue;
        lines.push(<line x1={xLeft} y1={y} x2={xRight} y2={y} stroke="currentColor" stroke-width={1 / props.unit} opacity={GRID_OPACITY} />);
      }
    }

    // Axes (thicker lines)
    lines.push(<line x1={xLeft} y1={0} x2={xRight} y2={0} stroke="currentColor" stroke-width={2 / props.unit} opacity={AXIS_OPACITY} />);
    lines.push(<line x1={0} y1={yBottom} x2={0} y2={yTop} stroke="currentColor" stroke-width={2 / props.unit} opacity={AXIS_OPACITY} />);

    return lines;
  });

  return (
    <g transform={`translate(${originX()}, ${originY()}) scale(1, -1)`}>
      <Show when={props.backgroundColor}>
        <rect
          x={extents().xLeft}
          y={extents().yBottom}
          width={props.width}
          height={props.height}
          fill={props.backgroundColor}
        />
      </Show>
      <g opacity={props.gridOpacity ?? 1}>{gridLines()}</g>
      {props.children}
    </g>
  );
}
