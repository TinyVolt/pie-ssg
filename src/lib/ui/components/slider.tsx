import type { ScalarNode } from '~/lib/nodes/state/Node';
import { num, scalar } from '~/lib/nodes/jax';
import { expectNode, type UiArg } from '../nodeHandle';

/** `pie.ui.slider(n, min=0, max=1, step=0.01)`: a slider for Scalar `n`. */
export function Slider(props: { args: UiArg[]; min?: number; max?: number; step?: number }) {
  const [n, setN] = expectNode<ScalarNode>(props.args[0], ['Scalar']);
  return (
    <input
      type="range"
      min={props.min ?? 0}
      max={props.max ?? 1}
      step={props.step ?? 0.01}
      value={num(n().value)}
      onInput={(e) => setN({ value: scalar(e.currentTarget.valueAsNumber) })}
    />
  );
}
