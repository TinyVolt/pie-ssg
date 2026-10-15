import { Node2NodeFunc } from './Node2NodeFunc';
import { AnyNode, PointNode, ScalarNode, TextNode } from '../state/Node';
import { scalar, num, add, sub, mul, div, sqrt, ref } from '../jax';

/**
 * Create a scalar value from another scalar.
 * @param value - Input scalar value
 * @returns Scalar node
 * @auxiliaryNodes None
 */
export const Scalar: Node2NodeFunc = {
  keyword: 'scalar', outputType: 'Scalar',
  parameters: [{ name: 'value', type: 'Scalar' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => {
      const valueNode = ins[0] as ScalarNode;
      const value = valueNode?.value || scalar(0);
      return { main: { type: 'Scalar', value } };
    };
    return inner(inputs);
  },
};

/**
 * Create a text node with a string value.
 * @param value - Text string value
 * @returns Text node
 * @auxiliaryNodes None
 */
export const Text: Node2NodeFunc = {
  keyword: 'text', outputType: 'Text',
  parameters: [{ name: 'value', type: 'Text' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => {
      const textNode = ins[0] as TextNode;
      const value = textNode?.value || '';
      return { main: { type: 'Text', value } };
    };
    return inner(inputs);
  },
};

/**
 * Create a point from x and y coordinates.
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Point node
 * @auxiliaryNodes None
 */
export const Point: Node2NodeFunc = {
  keyword: 'point', outputType: 'Point',
  parameters: [{ name: 'x', type: 'Scalar' }, { name: 'y', type: 'Scalar' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => {
      const xNode = ins[0] as ScalarNode;
      const yNode = ins[1] as ScalarNode;
      return {
        main: {
          type: 'Point',
          x: xNode.value,
          y: yNode.value
        }
      };
    };
    return inner(inputs);
  },
};

/**
 * Create a triangle from three vertex points.
 * @param vertex1 - First vertex point
 * @param vertex2 - Second vertex point
 * @param vertex3 - Third vertex point
 * @returns Triangle node
 * @auxiliaryNodes l_0, l_1, l_2 (Line nodes)
 */
export const Triangle: Node2NodeFunc = {
  keyword: 'triangle', outputType: 'Triangle',
  parameters: [{ name: 'vertex1', type: 'Point' }, { name: 'vertex2', type: 'Point' }, { name: 'vertex3', type: 'Point' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => {
      const nodes: Record<string, any> = {};
      for (let i = 0; i < 3; i++) {
        nodes[`l_${i}`] = { type: 'Line', p1: ins[i], p2: ins[(i + 1) % 3] };
      }
      nodes['main'] = { type: 'Triangle', vertices: ins };
      return nodes;
    };
    return inner(inputs);
  },
};

/**
 * Create a line from two points.
 * @param point1 - First point
 * @param point2 - Second point
 * @returns Line node
 * @auxiliaryNodes None
 */
export const Line: Node2NodeFunc = {
  keyword: 'line', outputType: 'Line',
  parameters: [{ name: 'point1', type: 'Point' }, { name: 'point2', type: 'Point' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => ({ main: { type: 'Line', p1: ins[0], p2: ins[1] } });
    return inner(inputs);
  },
};

/**
 * Create a circle with a center point and radius.
 * @param center - Center point of the circle
 * @param radius - Radius of the circle
 * @returns Circle node
 * @auxiliaryNodes None
 */
export const Circle: Node2NodeFunc = {
  keyword: 'circle', outputType: 'Circle',
  parameters: [{ name: 'center', type: 'Point' }, { name: 'radius', type: 'Scalar' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => ({ main: { type: 'Circle', center: ins[0], radius: ins[1] } });
    return inner(inputs);
  },
};

/**
 * Create an ellipse with center, radii, and rotation.
 * @param center - Center point of the ellipse
 * @param radiusX - Horizontal radius
 * @param radiusY - Vertical radius
 * @param rotation - Rotation angle in degrees
 * @returns Ellipse node
 * @auxiliaryNodes None
 */
export const Ellipse: Node2NodeFunc = {
  keyword: 'ellipse', outputType: 'Ellipse',
  parameters: [
    { name: 'center', type: 'Point' },
    { name: 'radiusX', type: 'Scalar' },
    { name: 'radiusY', type: 'Scalar' },
    { name: 'rotation', type: 'Scalar' }
  ],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => ({ main: { type: 'Ellipse', center: ins[0], radiusX: ins[1], radiusY: ins[2], rotation: ins[3] } });
    return inner(inputs);
  },
};

/**
 * Create a quadratic Bezier curve from two endpoints and a control point.
 * @param p1 - Start point
 * @param control - Control point
 * @param p2 - End point
 * @returns BezierQuadratic node
 * @auxiliaryNodes None
 */
export const BezierQuadratic: Node2NodeFunc = {
  keyword: 'bezier_quadratic', outputType: 'BezierQuadratic',
  parameters: [{ name: 'p1', type: 'Point' }, { name: 'control', type: 'Point' }, { name: 'p2', type: 'Point' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => ({ main: { type: 'BezierQuadratic', p1: ins[0], control: ins[1], p2: ins[2] } });
    return inner(inputs);
  }
};

/**
 * Create a cubic Bezier curve from two endpoints and two control points.
 * @param p1 - Start point
 * @param control1 - First control point
 * @param control2 - Second control point
 * @param p2 - End point
 * @returns BezierCubic node
 * @auxiliaryNodes None
 */
export const BezierCubic: Node2NodeFunc = {
  keyword: 'bezier_cubic', outputType: 'BezierCubic',
  parameters: [{ name: 'p1', type: 'Point' }, { name: 'control1', type: 'Point' }, { name: 'control2', type: 'Point' }, { name: 'p2', type: 'Point' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => ({ main: { type: 'BezierCubic', p1: ins[0], control1: ins[1], control2: ins[2], p2: ins[3] } });
    return inner(inputs);
  }
};

/**
 * Create an arc with center, radius, and start/end angles.
 * @param center - Center point of the arc
 * @param radius - Radius of the arc
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @returns Arc node
 * @auxiliaryNodes None
 */
export const Arc: Node2NodeFunc = {
  keyword: 'arc', outputType: 'Arc',
  parameters: [{ name: 'center', type: 'Point' }, { name: 'radius', type: 'Scalar' }, { name: 'startAngle', type: 'Scalar' }, { name: 'endAngle', type: 'Scalar' }],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => ({ main: { type: 'Arc', center: ins[0], radius: ins[1], startAngle: ins[2], endAngle: ins[3] } });
    return inner(inputs);
  }
};

/**
 * Create an ellipse from two foci and a string length.
 * @param focus1 - First focus point
 * @param focus2 - Second focus point
 * @param stringLength - Total string length (sum of distances from any point on ellipse to both foci)
 * @returns Ellipse node
 * @auxiliaryNodes center, radiusX, radiusY, rotation
 */
export const EllipseFromFociAndStringLength: Node2NodeFunc = {
  keyword: 'ellipse_from_foci', outputType: 'Ellipse',
  parameters: [
    { name: 'focus1', type: 'Point' },
    { name: 'focus2', type: 'Point' },
    { name: 'stringLength', type: 'Scalar' }
  ],
  compute(inputs) {
    const inner = (ins: AnyNode[]) => {
      const focus1 = ins[0] as PointNode;
      const focus2 = ins[1] as PointNode;
      const stringLengthNode = ins[2] as ScalarNode;
      
      const dx = sub(ref(focus2.x), ref(focus1.x));
      const dy = sub(ref(focus2.y), ref(focus1.y));
      const focalDistance = sqrt(add(mul(ref(dx), ref(dx)), mul(ref(dy), ref(dy))));
      
      if (num(stringLengthNode.value) <= num(focalDistance)) {
        return { main: { type: 'Dummy' } };
      }
      
      const cx = div(add(ref(focus1.x), ref(focus2.x)), scalar(2));
      const cy = div(add(ref(focus1.y), ref(focus2.y)), scalar(2));
      const center = { type: 'Point', x: cx, y: cy };
      
      const c = div(ref(focalDistance), scalar(2));
      const a = div(ref(stringLengthNode.value), scalar(2));
      
      const cSquared = mul(ref(c), ref(c));
      const aSquared = mul(ref(a), ref(a));
      const bSquared = sub(ref(aSquared), ref(cSquared));
      const b = sqrt(ref(bSquared));
      
      const angleRad = scalar(Math.atan2(num(dy), num(dx)));
      const angleDeg = div(mul(ref(angleRad), scalar(180)), scalar(Math.PI));
      
      const radiusX = { type: 'Scalar', value: a };
      const radiusY = { type: 'Scalar', value: b };
      const rotation = { type: 'Scalar', value: angleDeg };
      
      return {
        center,
        radiusX,
        radiusY,
        rotation,
        main: { type: 'Ellipse', center, radiusX, radiusY, rotation }
      };
    };
    return inner(inputs);
  }
};

/** Docs category for the functions defined in this file. */
export const category = 'Basic Figures';
