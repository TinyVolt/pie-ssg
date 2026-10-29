import type { ScalarNode, TextNode } from '~/lib/nodes/state/Node';
import { num, scalar } from '~/lib/nodes/jax';
import { expectNode, type UiArg } from '../nodeHandle';

/** `pie.ui.textbox(n)`: a text box for Scalar or Text `n`. It writes on Enter or on leaving the box. */
export function Textbox(props: { args: UiArg[] }) {
  const [n, setN] = expectNode<ScalarNode | TextNode>(props.args[0], ['Scalar', 'Text']);
  const shown = () => {
    const node = n();
    return node.type === 'Scalar' ? String(num(node.value)) : node.value;
  };

  const write = (input: HTMLInputElement) => {
    if (n().type === 'Text') return setN({ value: input.value });
    const value = Number(input.value);
    // Not a number: put the current value back.
    if (input.value.trim() === '' || Number.isNaN(value)) input.value = shown();
    else setN({ value: scalar(value) });
  };

  return <input type="text" value={shown()} onChange={(e) => write(e.currentTarget)} />;
}
