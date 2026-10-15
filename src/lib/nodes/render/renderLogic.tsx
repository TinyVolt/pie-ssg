import { PointNode, LineNode, TriangleNode, CircleNode, EllipseNode, ArcNode, BezierQuadraticNode, BezierCubicNode, AnyNode, NodeType, NodeTypeMap } from "../state/Node";
import { num } from "../jax";
import { Accessor, JSXElement, Show } from "solid-js";

// Sizes are in pixels. Strokes use `non-scaling-stroke` so their width ignores zoom;
// the point radius is divided by `unit` (pixels per grid unit) instead.
const COLOR = 'currentColor';
const STROKE_WIDTH = 2;
const POINT_RADIUS = 4;

// Each render function runs once per element. It reads the node accessor inside
// the attributes, so a node change updates those attributes in place.
const renderPoint = (node: Accessor<AnyNode>, unit: Accessor<number>) => {
    const point = node as Accessor<PointNode>

    return (
        <circle cx={num(point().x)} cy={num(point().y)} r={POINT_RADIUS / unit()} fill={COLOR} />
    );
}

const renderLine = (node: Accessor<AnyNode>) => {
    const line = node as Accessor<LineNode>

    return (
        <Show when={line().p1 && line().p2}>
            <line x1={num(line().p1.x)} y1={num(line().p1.y)} x2={num(line().p2.x)} y2={num(line().p2.y)} stroke={COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderTriangle = (node: Accessor<AnyNode>) => {
    const triangle = node as Accessor<TriangleNode>;

    const pointsStr = () => {
        const [p1, p2, p3] = triangle().vertices;
        return `${num(p1.x)},${num(p1.y)} ${num(p2.x)},${num(p2.y)} ${num(p3.x)},${num(p3.y)}`;
    };

    return (
        <Show when={triangle().vertices[0] && triangle().vertices[1] && triangle().vertices[2]}>
            <polygon points={pointsStr()} fill="none" stroke={COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderCircle = (node: Accessor<AnyNode>) => {
    const circle = node as Accessor<CircleNode>;

    return (
        <Show when={circle().center}>
            <circle cx={num(circle().center.x)} cy={num(circle().center.y)} r={num(circle().radius.value)} fill="none" stroke={COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderEllipse = (node: Accessor<AnyNode>) => {
    const ellipse = node as Accessor<EllipseNode>;

    const cx = () => num(ellipse().center.x);
    const cy = () => num(ellipse().center.y);
    const rx = () => num(ellipse().radiusX.value);
    const ry = () => num(ellipse().radiusY.value);
    const rotation = () => num(ellipse().rotation.value);

    return (
        <Show when={ellipse().center}>
            <ellipse cx={cx()} cy={cy()} rx={rx()} ry={ry()} transform={`rotate(${rotation()} ${cx()} ${cy()})`} fill="none" stroke={COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderArc = (node: Accessor<AnyNode>) => {
    const arc = node as Accessor<ArcNode>;

    const pathData = () => {
        const center = arc().center;
        const startAngleRad = (num(arc().startAngle.value) * Math.PI) / 180;
        const endAngleRad = (num(arc().endAngle.value) * Math.PI) / 180;
        const arcRadius = num(arc().radius.value);
        const cx = num(center.x), cy = num(center.y);

        const startX = cx + arcRadius * Math.cos(startAngleRad);
        const startY = cy + arcRadius * Math.sin(startAngleRad);
        const endX = cx + arcRadius * Math.cos(endAngleRad);
        const endY = cy + arcRadius * Math.sin(endAngleRad);

        const largeArcFlag = Math.abs(num(arc().endAngle.value) - num(arc().startAngle.value)) > 180 ? 1 : 0;

        return `M ${startX},${startY} A ${arcRadius},${arcRadius} 0 ${largeArcFlag} 1 ${endX},${endY}`;
    };

    return (
        <Show when={arc().center}>
            <path d={pathData()} fill="none" stroke={COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderBezierQuadratic = (node: Accessor<AnyNode>) => {
    const bezier = node as Accessor<BezierQuadraticNode>;

    const pathData = () => {
        const { p1, control, p2 } = bezier();
        return `M ${num(p1.x)},${num(p1.y)} Q ${num(control.x)},${num(control.y)} ${num(p2.x)},${num(p2.y)}`;
    };

    return (
        <Show when={bezier().p1 && bezier().control && bezier().p2}>
            <path d={pathData()} fill="none" stroke={COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderBezierCubic = (node: Accessor<AnyNode>) => {
    const bezier = node as Accessor<BezierCubicNode>;

    const pathData = () => {
        const { p1, control1, control2, p2 } = bezier();
        return `M ${num(p1.x)},${num(p1.y)} C ${num(control1.x)},${num(control1.y)} ${num(control2.x)},${num(control2.y)} ${num(p2.x)},${num(p2.y)}`;
    };

    return (
        <Show when={bezier().p1 && bezier().control1 && bezier().control2 && bezier().p2}>
            <path d={pathData()} fill="none" stroke={COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderMap: Partial<Record<keyof NodeTypeMap, (node: Accessor<AnyNode>, unit: Accessor<number>) => JSXElement | null>> = {
    Point: renderPoint,
    Line: renderLine,
    Triangle: renderTriangle,
    Circle: renderCircle,
    Ellipse: renderEllipse,
    Arc: renderArc,
    BezierQuadratic: renderBezierQuadratic,
    BezierCubic: renderBezierCubic,
};

export const renderNode = (type: NodeType, node: Accessor<AnyNode>, unit: Accessor<number>): JSXElement | null => {
    const fn = renderMap[type];
    return fn ? fn(node, unit) : null;
};
