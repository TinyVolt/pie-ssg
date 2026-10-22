import type { Accessor } from 'solid-js';
import type { Node, NodeDefinition, PointNode, ScalarNode } from '~/lib/nodes/state/Node';
import { num } from '~/lib/nodes/jax';

/** An axis-aligned square. Made from Python with `pie.square(center, side)`, see `functions/square.ts`. */
export interface SquareNode extends Node {
  type: 'Square';
  center: PointNode;
  side: ScalarNode;
}

// Adds 'Square' to the node types, so functions can take and return it.
declare module '~/lib/nodes/state/Node' {
  interface NodeTypeMap {
    Square: SquareNode;
  }
}

const renderSquare = (square: Accessor<SquareNode>) => {
  const side = () => num(square().side.value);

  return (
    <rect
      x={num(square().center.x) - side() / 2}
      y={num(square().center.y) - side() / 2}
      width={side()}
      height={side()}
      fill="none"
      stroke="currentColor"
      stroke-width={2}
      vector-effect="non-scaling-stroke"
    />
  );
};

export const Square: NodeDefinition<SquareNode> = { type: 'Square', prefix: 'sq', render: renderSquare };
