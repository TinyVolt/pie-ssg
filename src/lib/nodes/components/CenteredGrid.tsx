import { JSX } from 'solid-js';

interface CenteredGridProps {
  /** The grid spans -extent..extent on both axes, origin at the center. */
  extent: number;
  children: JSX.Element;
}

const GRID_OPACITY = 0.15;
const AXIS_OPACITY = 0.4;

export function CenteredGrid(props: CenteredGridProps) {
  const gridLines = () => {
    const lines: JSX.Element[] = [];
    const e = props.extent;

    for (let i = -e; i <= e; i += 1) {
      if (i === 0) continue;
      // Vertical, then horizontal (every 1 unit)
      lines.push(<line x1={i} y1={-e} x2={i} y2={e} stroke="currentColor" stroke-width={0.02} opacity={GRID_OPACITY} />);
      lines.push(<line x1={-e} y1={i} x2={e} y2={i} stroke="currentColor" stroke-width={0.02} opacity={GRID_OPACITY} />);
    }

    // Axes (thicker lines)
    lines.push(<line x1={-e} y1={0} x2={e} y2={0} stroke="currentColor" stroke-width={0.04} opacity={AXIS_OPACITY} />);
    lines.push(<line x1={0} y1={-e} x2={0} y2={e} stroke="currentColor" stroke-width={0.04} opacity={AXIS_OPACITY} />);

    return lines;
  };

  return (
    <g transform="scale(1, -1)">
      {gridLines()}
      {props.children}
    </g>
  );
}
