import type { ScalarNode } from '~/lib/nodes/state/Node';
import { num, scalar } from '~/lib/nodes/jax';
import { expectNode, type UiArg } from '~/lib/ui/nodeHandle';

/** `pie.ui.stepper(n, step=1)`: − and + buttons that change Scalar `n` by `step`, with its value between them. */
export function Stepper(props: { args: UiArg[]; step?: number }) {
  const [n, setN] = expectNode<ScalarNode>(props.args[0], ['Scalar']);
  const step = props.step ?? 1;
  const add = (delta: number) => setN({ value: scalar(num(n().value) + delta) });
  return (
    <span>
      <button type="button" onClick={() => add(-step)}>−</button>
      {' '}{num(n().value)}{' '}
      <button type="button" onClick={() => add(step)}>+</button>
    </span>
  );
}
