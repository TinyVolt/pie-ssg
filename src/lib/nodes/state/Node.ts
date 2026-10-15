import type { Dtype } from '../jax';

export interface Node {
  id: string;
  type: string;
  __graph_deps?: {
    funcKeyword: string;
    inputNodeIds: string[];
    blueprintKey?: string;
    // ID of the 'main' output node, set on a function's auxiliary nodes.
    parentId?: string;
  };
}

export interface TextNode extends Node {
  type: 'Text';
  value: string;
}

export interface PointNode extends Node {
  type: 'Point';
  x: Dtype;
  y: Dtype;
}

export interface ScalarNode extends Node {
  type: 'Scalar';
  value: Dtype;
}

export interface TriangleNode extends Node {
  type: 'Triangle';
  vertices: PointNode[];
}

export interface LineNode extends Node {
  type: 'Line';
  p1: PointNode;
  p2: PointNode;
}

export interface CircleNode extends Node {
  type: 'Circle';
  center: PointNode;
  radius: ScalarNode;
}

export interface EllipseNode extends Node {
  type: 'Ellipse';
  center: PointNode;
  radiusX: ScalarNode;
  radiusY: ScalarNode;
  rotation: ScalarNode;
}

export interface BezierQuadraticNode extends Node {
  type: 'BezierQuadratic';
  p1: PointNode;
  control: PointNode;
  p2: PointNode;
}

export interface BezierCubicNode extends Node {
  type: 'BezierCubic';
  p1: PointNode;
  control1: PointNode;
  control2: PointNode;
  p2: PointNode;
}

export interface ArcNode extends Node {
  type: 'Arc';
  center: PointNode;
  radius: ScalarNode;
  startAngle: ScalarNode;
  endAngle: ScalarNode;
}

export interface DummyNode extends Node {
  type: 'Dummy';
}

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
  Dummy: DummyNode;
}

export type AnyNode = NodeTypeMap[keyof NodeTypeMap];
export type NodeType = keyof NodeTypeMap;
