import { Node2NodeFunc } from '~/lib/nodes/functions/Node2NodeFunc';
import { AnyNode, PointNode } from '~/lib/nodes/state/Node';
import { add, div, ref, scalar } from '~/lib/nodes/jax';

/**
 * The point halfway between two points. Called from Python as `pie.midpoint(p1, p2)`.
 * @param point1 - First point
 * @param point2 - Second point
 * @returns Point node
 * @auxiliaryNodes None
 */
export const Midpoint: Node2NodeFunc = {
  keyword: 'midpoint', outputType: 'Point',
  parameters: [{ name: 'point1', type: 'Point' }, { name: 'point2', type: 'Point' }],
  compute(inputs: AnyNode[]) {
    const p1 = inputs[0] as PointNode;
    const p2 = inputs[1] as PointNode;
    return {
      main: {
        type: 'Point',
        x: div(add(ref(p1.x), ref(p2.x)), scalar(2)),
        y: div(add(ref(p1.y), ref(p2.y)), scalar(2)),
      },
    };
  },
};

/** Docs category for the functions defined in this file. */
export const category = 'Custom';
