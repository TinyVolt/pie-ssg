import type { JSX } from 'solid-js';

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

/** The shared frame for the icons below: 24×24 drawing, lines in the text color. */
function Icon(props: { children: JSX.Element }) {
  return (
    <svg
      class="icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function PlayIcon() {
  return (
    <Icon>
      <path d="M6 4l14 8-14 8z" fill="currentColor" />
    </Icon>
  );
}

export function StopIcon() {
  return (
    <Icon>
      <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" />
    </Icon>
  );
}

export function ResetIcon() {
  return (
    <Icon>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Icon>
  );
}

export function CopyIcon() {
  return (
    <Icon>
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon>
      <path d="M20 6L9 17l-5-5" />
    </Icon>
  );
}

export function CrossIcon() {
  return (
    <Icon>
      <path d="M18 6L6 18M6 6l12 12" />
    </Icon>
  );
}
