import { JSX, createMemo } from 'solid-js';
import { MIN_GRID_UNIT } from '../state/NodeStore';

interface CenteredGridProps {
  /** Canvas size in viewBox units. The origin sits at the center. */
  width: number;
  height: number;
  /** Pixels per grid unit. */
  unit: number;
  children: JSX.Element;
}

const GRID_OPACITY = 0.15;
const AXIS_OPACITY = 0.4;

export function CenteredGrid(props: CenteredGridProps) {
  const originX = () => props.width / 2;
  const originY = () => props.height / 2;

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
      {gridLines()}
      {props.children}
    </g>
  );
}
