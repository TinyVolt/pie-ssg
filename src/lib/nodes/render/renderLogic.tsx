import type { PointNode, LineNode, TriangleNode, CircleNode, EllipseNode, ArcNode, BezierQuadraticNode, BezierCubicNode, PointGradNode } from "../state/Node";
import { num } from "../jax";
import { Accessor, Show } from "solid-js";

// Sizes are in pixels. Strokes use `non-scaling-stroke` so their width ignores zoom;
// the point radius is divided by `unit` (pixels per grid unit) instead.
const COLOR = 'currentColor';
const STROKE_WIDTH = 2;
const POINT_RADIUS = 4;
const ARROW_HEAD = 10;

// Each render function runs once per element. It reads the node accessor inside
// the attributes, so a node change updates those attributes in place.
const renderPoint = (point: Accessor<PointNode>, unit: Accessor<number>) => {
    return (
        <circle cx={num(point().x)} cy={num(point().y)} r={POINT_RADIUS / unit()} fill={point().fill ?? COLOR} />
    );
}

const renderLine = (line: Accessor<LineNode>) => {
    return (
        <Show when={line().p1 && line().p2}>
            <line x1={num(line().p1.x)} y1={num(line().p1.y)} x2={num(line().p2.x)} y2={num(line().p2.y)} stroke={line().stroke ?? COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderTriangle = (triangle: Accessor<TriangleNode>) => {
    const pointsStr = () => {
        const [p1, p2, p3] = triangle().vertices;
        return `${num(p1.x)},${num(p1.y)} ${num(p2.x)},${num(p2.y)} ${num(p3.x)},${num(p3.y)}`;
    };

    return (
        <Show when={triangle().vertices[0] && triangle().vertices[1] && triangle().vertices[2]}>
            <polygon points={pointsStr()} fill={triangle().fill ?? 'none'} stroke={triangle().stroke ?? COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderCircle = (circle: Accessor<CircleNode>) => {
    return (
        <Show when={circle().center}>
            <circle cx={num(circle().center.x)} cy={num(circle().center.y)} r={num(circle().radius.value)} fill={circle().fill ?? 'none'} stroke={circle().stroke ?? COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderEllipse = (ellipse: Accessor<EllipseNode>) => {
    const cx = () => num(ellipse().center.x);
    const cy = () => num(ellipse().center.y);
    const rx = () => num(ellipse().radiusX.value);
    const ry = () => num(ellipse().radiusY.value);
    const rotation = () => num(ellipse().rotation.value);

    return (
        <Show when={ellipse().center}>
            <ellipse cx={cx()} cy={cy()} rx={rx()} ry={ry()} transform={`rotate(${rotation()} ${cx()} ${cy()})`} fill={ellipse().fill ?? 'none'} stroke={ellipse().stroke ?? COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderArc = (arc: Accessor<ArcNode>) => {
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
            <path d={pathData()} fill={arc().fill ?? 'none'} stroke={arc().stroke ?? COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderBezierQuadratic = (bezier: Accessor<BezierQuadraticNode>) => {
    const pathData = () => {
        const { p1, control, p2 } = bezier();
        return `M ${num(p1.x)},${num(p1.y)} Q ${num(control.x)},${num(control.y)} ${num(p2.x)},${num(p2.y)}`;
    };

    return (
        <Show when={bezier().p1 && bezier().control && bezier().p2}>
            <path d={pathData()} fill={bezier().fill ?? 'none'} stroke={bezier().stroke ?? COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

const renderBezierCubic = (bezier: Accessor<BezierCubicNode>) => {
    const pathData = () => {
        const { p1, control1, control2, p2 } = bezier();
        return `M ${num(p1.x)},${num(p1.y)} C ${num(control1.x)},${num(control1.y)} ${num(control2.x)},${num(control2.y)} ${num(p2.x)},${num(p2.y)}`;
    };

    return (
        <Show when={bezier().p1 && bezier().control1 && bezier().control2 && bezier().p2}>
            <path d={pathData()} fill={bezier().fill ?? 'none'} stroke={bezier().stroke ?? COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
        </Show>
    );
}

// Draws (dx, dy) in grid units, starting at the point. No arrow when it is zero or NaN.
const renderPointGrad = (grad: Accessor<PointGradNode>, unit: Accessor<number>) => {
    const arrow = () => {
        const g = grad();
        const x = num(g.point.x), y = num(g.point.y), dx = num(g.dx), dy = num(g.dy);
        const length = Math.hypot(dx, dy);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(length) || length === 0) return null;
        const ux = dx / length, uy = dy / length;
        // The head shrinks to fit an arrow shorter than it.
        const head = Math.min(ARROW_HEAD / unit(), length);
        const tipX = x + dx, tipY = y + dy;
        const baseX = tipX - head * ux, baseY = tipY - head * uy;
        const half = head / 2;
        return {
            x, y, baseX, baseY,
            head: `${tipX},${tipY} ${baseX - half * uy},${baseY + half * ux} ${baseX + half * uy},${baseY - half * ux}`,
        };
    };

    return (
        <Show when={arrow()}>
            {(a) => (
                <>
                    <line x1={a().x} y1={a().y} x2={a().baseX} y2={a().baseY} stroke={grad().stroke ?? COLOR} stroke-width={STROKE_WIDTH} vector-effect="non-scaling-stroke" />
                    <polygon points={a().head} fill={grad().fill ?? COLOR} />
                </>
            )}
        </Show>
    );
}

export {
    renderPoint,
    renderLine,
    renderTriangle,
    renderCircle,
    renderEllipse,
    renderArc,
    renderBezierQuadratic,
    renderBezierCubic,
    renderPointGrad,
};
