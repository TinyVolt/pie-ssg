export type Direction = 'left' | 'right' | 'up' | 'down';

const CHEVRON_TURN: Record<Direction, number> = { left: 0, up: 90, right: 180, down: 270 };

/** A small arrow pointing `direction`. */
export function Chevron(props: { direction: Direction }) {
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
