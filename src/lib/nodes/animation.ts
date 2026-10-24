import { batch } from 'solid-js';

/** How long an animation takes. */
const ANIMATION_MS = 500;

/** The steps an animation plays: one per frame at 60 frames a second. Each frame shows the nearest step. */
const STEPS = 30;

/** Slow at the start and end, fast in the middle. `t` and the result go from 0 to 1. */
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2);

/** One animated change, e.g. a point moving. */
export interface Track {
  /** Shows the change at `t`, from 0 (start) to 1 (end). */
  seek: (t: number) => void;
  /** True once the node was replaced or removed: the track no longer changes anything. */
  stopped: () => boolean;
}

/**
 * Runs before an animation plays, e.g. to get every value its steps need. `visitSteps` shows each step
 * in turn, then goes back to the start. Can return a function to call when the animation ends.
 */
export type Prepare = (visitSteps: () => void) => Promise<(() => void) | void>;

/** Plays `tracks` together, after `prepare`. Resolves when they end, or once every track is stopped. */
export async function play(tracks: Track[], prepare?: Prepare): Promise<void> {
  const seek = (step: number) => batch(() => {
    const t = easeInOut(step / STEPS);
    for (const track of tracks) track.seek(t);
  });
  const end = await prepare?.(() => {
    for (let step = 0; step <= STEPS; step++) seek(step);
    seek(0);
  });
  await new Promise<void>((resolve) => {
    const start = performance.now();
    requestAnimationFrame(function frame() {
      if (tracks.every(track => track.stopped())) return resolve();
      const step = Math.min(Math.round((performance.now() - start) / ANIMATION_MS * STEPS), STEPS);
      seek(step);
      if (step < STEPS) requestAnimationFrame(frame);
      else resolve();
    });
  });
  end?.();
}
