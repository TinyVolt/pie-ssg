import { Node2NodeFunc } from '~/lib/nodes/functions/Node2NodeFunc';
import { AnyNode } from '~/lib/nodes/state/Node';

/**
 * An axis-aligned square, drawn by the `Square` node type in `nodes/square.tsx`. Called from Python as `pie.square(center, side)`.
 * @param center - Center point of the square
 * @param side - Side length
 * @returns Square node
 * @auxiliaryNodes None
 */
export const Square: Node2NodeFunc = {
  keyword: 'square', outputType: 'Square',
  parameters: [{ name: 'center', type: 'Point' }, { name: 'side', type: 'Scalar' }],
  compute(inputs: AnyNode[]) {
    return { main: { type: 'Square', center: inputs[0], side: inputs[1] } };
  },
};

/** Docs category for the functions defined in this file. */
export const category = 'Custom';
