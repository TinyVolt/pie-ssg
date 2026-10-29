import { Index } from 'solid-js';
import type { ArrayNode, ScalarNode } from '~/lib/nodes/state/Node';
import { num, scalar } from '~/lib/nodes/jax';
import { expectNode, useSetNode, type UiArg } from '../nodeHandle';

/**
 * `pie.ui.checkboxes(mask, options=['a', 'b'])`: one checkbox per item of the Array of Scalars `mask`.
 * An item is 1 when ticked, 0 when not; any value other than 0 shows as ticked.
 * `options`: one label per item, in row-major order. Without it, the labels are the item positions.
 */
export function Checkboxes(props: { args: UiArg[]; options?: string[] }) {
  const [mask] = expectNode<ArrayNode>(props.args[0], ['Array']);
  const setNode = useSetNode();
  const items = () => {
    const array = mask();
    if (array.itemType !== 'Scalar') throw new Error(`expects an Array of Scalars, got an Array of ${array.itemType}`);
    if (props.options && props.options.length !== array.items.length) {
      throw new Error(`got ${props.options.length} options for ${array.items.length} items`);
    }
    return array.items as ScalarNode[];
  };

  // `Index`, not `For`: the items are new objects after every change, but their positions stay.
  return (
    <span class="pie-ui-choices">
      <Index each={items()}>
        {(item, i) => (
          <label>
            <input
              type="checkbox"
              checked={num(item().value) !== 0}
              onChange={(e) => setNode(item(), { value: scalar(e.currentTarget.checked ? 1 : 0) })}
            />
            {props.options?.[i] ?? String(i)}
          </label>
        )}
      </Index>
    </span>
  );
}
