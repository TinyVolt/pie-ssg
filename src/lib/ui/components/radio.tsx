import { createUniqueId, For } from 'solid-js';
import type { ScalarNode } from '~/lib/nodes/state/Node';
import { num, scalar } from '~/lib/nodes/jax';
import { expectNode, type UiArg } from '../nodeHandle';

/** `pie.ui.radio(n, options=['a', 'b'])`: one radio button per option. Scalar `n` holds the chosen one's index. */
export function Radio(props: { args: UiArg[]; options?: string[] }) {
  const [n, setN] = expectNode<ScalarNode>(props.args[0], ['Scalar']);
  if (!props.options?.length) throw new Error('needs `options`, a list of labels');
  // Groups the buttons, so choosing one unchecks the others.
  const group = createUniqueId();

  return (
    <span class="pie-ui-choices">
      <For each={props.options}>
        {(label, i) => (
          <label>
            <input type="radio" name={group} checked={num(n().value) === i()} onChange={() => setN({ value: scalar(i()) })} />
            {label}
          </label>
        )}
      </For>
    </span>
  );
}
