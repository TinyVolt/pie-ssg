import type { Accessor, JSXElement } from 'solid-js';
import type { Dtype } from '../jax';
import {
  renderPoint,
  renderLine,
  renderTriangle,
  renderCircle,
  renderEllipse,
  renderArc,
  renderBezierQuadratic,
  renderBezierCubic,
  renderPointGrad,
  renderText,
} from '../render/renderLogic';

export interface Node {
  id: string;
  type: string;
  hidden?: boolean;
  /** A CSS color or 'none'. */
  fill?: string;
  /** A CSS color or 'none'. */
  stroke?: string;
  __graph_deps?: {
    funcKeyword: string;
    inputNodes: AnyNode[];
    blueprintKey?: string;
    // ID of the 'main' output node, set on a function's auxiliary nodes.
    parentId?: string;
  };
}

export function checkColor(keyword: string, name: string, value?: string) {
  if (value !== undefined && value !== 'none' && !CSS.supports('color', value)) {
    throw new Error(`${keyword}: ${name} '${value}' is not a valid color`);
  }
}

export interface NodeDefinition<N extends Node = AnyNode> {
  type: N['type'];
  /** Start of generated ids: 'p' gives p0, p1, …. Default: `type` in lower case. */
  prefix?: string;
  /** Draws the node, in grid units. `unit` is pixels per grid unit. Without it the node is not drawn. */
  render?(node: Accessor<N>, unit: Accessor<number>): JSXElement | null;
}

/**
 * Drawn only when it has both `x` and `y`, the center of its box.
 * `w`, `h`: the box size in grid units. 0 and 0: one line, no box. Above 0: fixed. -1: fits the text, at most 5.
 */
export interface TextNode extends Node {
  type: 'Text';
  value: string;
  x?: ScalarNode;
  y?: ScalarNode;
  /** In pixels. */
  fontSize?: ScalarNode;
  w?: ScalarNode;
  h?: ScalarNode;
}
const TextDefinition: NodeDefinition<TextNode> = { type: 'Text', prefix: 'text', render: renderText };

export interface PointNode extends Node {
  type: 'Point';
  x: Dtype;
  y: Dtype;
}
const PointDefinition: NodeDefinition<PointNode> = { type: 'Point', prefix: 'p', render: renderPoint };

export interface ScalarNode extends Node {
  type: 'Scalar';
  value: Dtype;
}
const ScalarDefinition: NodeDefinition<ScalarNode> = { type: 'Scalar', prefix: 'num' };

export interface TriangleNode extends Node {
  type: 'Triangle';
  vertices: PointNode[];
}
const TriangleDefinition: NodeDefinition<TriangleNode> = { type: 'Triangle', prefix: 'tr', render: renderTriangle };

export interface LineNode extends Node {
  type: 'Line';
  p1: PointNode;
  p2: PointNode;
}
const LineDefinition: NodeDefinition<LineNode> = { type: 'Line', prefix: 'line', render: renderLine };

export interface CircleNode extends Node {
  type: 'Circle';
  center: PointNode;
  radius: ScalarNode;
}
const CircleDefinition: NodeDefinition<CircleNode> = { type: 'Circle', prefix: 'circ', render: renderCircle };

export interface EllipseNode extends Node {
  type: 'Ellipse';
  center: PointNode;
  radiusX: ScalarNode;
  radiusY: ScalarNode;
  rotation: ScalarNode;
}
const EllipseDefinition: NodeDefinition<EllipseNode> = { type: 'Ellipse', prefix: 'ell', render: renderEllipse };

export interface BezierQuadraticNode extends Node {
  type: 'BezierQuadratic';
  p1: PointNode;
  control: PointNode;
  p2: PointNode;
}
const BezierQuadraticDefinition: NodeDefinition<BezierQuadraticNode> = { type: 'BezierQuadratic', prefix: 'bq', render: renderBezierQuadratic };

export interface BezierCubicNode extends Node {
  type: 'BezierCubic';
  p1: PointNode;
  control1: PointNode;
  control2: PointNode;
  p2: PointNode;
}
const BezierCubicDefinition: NodeDefinition<BezierCubicNode> = { type: 'BezierCubic', prefix: 'bc', render: renderBezierCubic };

export interface ArcNode extends Node {
  type: 'Arc';
  center: PointNode;
  radius: ScalarNode;
  startAngle: ScalarNode;
  endAngle: ScalarNode;
}
const ArcDefinition: NodeDefinition<ArcNode> = { type: 'Arc', prefix: 'arc', render: renderArc };

/** d target / d point, drawn as an arrow (dx, dy) starting at `point`. */
export interface PointGradNode extends Node {
  type: 'PointGrad';
  point: PointNode;
  target: ScalarNode;
  dx: Dtype;
  dy: Dtype;
}
const PointGradDefinition: NodeDefinition<PointGradNode> = { type: 'PointGrad', prefix: 'pointgrad', render: renderPointGrad };

/** `items` in row-major order: shape [2, 3] holds row 0's three items, then row 1's. */
export interface ArrayNode extends Node {
  type: 'Array';
  /** 'Mixed' when the items are not all one type. */
  itemType: NodeType | 'Mixed';
  shape: number[];
  items: AnyNode[];
}
const ArrayDefinition: NodeDefinition<ArrayNode> = { type: 'Array', prefix: 'arr' };

export interface DummyNode extends Node {
  type: 'Dummy';
}
/** An empty prefix gives an empty id. */
const DummyDefinition: NodeDefinition<DummyNode> = { type: 'Dummy', prefix: '' };

export interface NodeTypeMap {
  Text: TextNode;
  Point: PointNode;
  Scalar: ScalarNode;
  Triangle: TriangleNode;
  Line: LineNode;
  Circle: CircleNode;
  Ellipse: EllipseNode;
  BezierQuadratic: BezierQuadraticNode;
  BezierCubic: BezierCubicNode;
  Arc: ArcNode;
  PointGrad: PointGradNode;
  Array: ArrayNode;
  Dummy: DummyNode;
}

export type AnyNode = NodeTypeMap[keyof NodeTypeMap];
export type NodeType = keyof NodeTypeMap;

const isNodeDefinition = (def: unknown): def is NodeDefinition =>
  typeof def === 'object' && def !== null && typeof (def as NodeDefinition).type === 'string';

// The site's own node types: each `nodes/**/*.{ts,tsx}` exports `NodeDefinition`s, like `nodes/square.tsx`.
const customModules = import.meta.glob<Record<string, unknown>>('/nodes/**/*.{ts,tsx}', { eager: true });

// File path -> its definitions. Built-ins first.
const definitionsByFile: [string, unknown[]][] = [
  ['src/lib/nodes/state/Node.ts', [
    TextDefinition, PointDefinition, ScalarDefinition, TriangleDefinition, LineDefinition, CircleDefinition,
    EllipseDefinition, BezierQuadraticDefinition, BezierCubicDefinition, ArcDefinition, PointGradDefinition,
    ArrayDefinition, DummyDefinition,
  ]],
  ...Object.entries(customModules).map(([path, mod]): [string, unknown[]] => [path.slice(1), Object.values(mod)]),
];

const nodeDefinitions = new Map<string, NodeDefinition>();
const sourceFile = new Map<string, string>();
for (const [file, defs] of definitionsByFile) {
  for (const def of defs.filter(isNodeDefinition)) {
    const other = sourceFile.get(def.type);
    if (other !== undefined) {
      throw new Error(`Duplicate node type '${def.type}': ${file} and ${other}`);
    }
    nodeDefinitions.set(def.type, def);
    sourceFile.set(def.type, file);
  }
}

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return nodeDefinitions.get(type);
}

/** Every node type, built-in and the site's own. */
export function getNodeTypes(): NodeType[] {
  return [...nodeDefinitions.keys()] as NodeType[];
}
