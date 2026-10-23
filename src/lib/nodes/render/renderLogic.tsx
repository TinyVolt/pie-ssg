import type { PointNode, LineNode, TriangleNode, CircleNode, EllipseNode, ArcNode, BezierQuadraticNode, BezierCubicNode, PointGradNode, TextNode } from "../state/Node";
import { num } from "../jax";
import { Accessor, For, Show } from "solid-js";

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

// A box's size in grid units when its width or height fits the text.
const TEXT_MAX_AUTO = 5;
// CSS variables don't work in SVG attributes, only in `style`.
const PAGE_BACKGROUND = 'var(--color-bg, #fff)';

interface TextLayout {
    boxed: boolean;
    /** Font size in grid units. */
    fs: number;
    lineHeight: number;
    lines: string[];
    outerW: number;
    outerH: number;
}

/** Sizes in grid units. `unit` is pixels per grid unit. */
function textLayout(t: TextNode, unit: number): TextLayout {
    const text = t.value;
    const fs = (t.fontSize ? num(t.fontSize.value) : 12) / unit;
    const lineHeight = fs * 1.4;
    const rawW = t.w ? num(t.w.value) : -1;
    const rawH = t.h ? num(t.h.value) : -1;

    if (rawW !== 0 || rawH !== 0) {
        const charW = 0.55 * fs;
        // Space between the box's edge and the text.
        const bgPad = 10 / unit;
        // 0 means auto here too, when the other one isn't 0.
        const wAuto = rawW <= 0;
        const hAuto = rawH <= 0;

        // Breaks at whitespace and after hyphens. A token longer than a line is cut.
        const wrap = (charsPerLine: number): string[] => {
            const cpl = Math.max(1, charsPerLine);
            const tokens: string[] = [];
            for (const word of text.split(/\s+/).filter(Boolean)) {
                for (const part of word.split(/(?<=-)/)) {
                    if (part.length <= cpl) {
                        tokens.push(part);
                    } else {
                        for (let i = 0; i < part.length; i += cpl) tokens.push(part.slice(i, i + cpl));
                    }
                }
            }
            const lines: string[] = [];
            let current = '';
            for (const token of tokens) {
                const sep = current && !current.endsWith('-') ? ' ' : '';
                const candidate = current + sep + token;
                if (candidate.length <= cpl) {
                    current = candidate;
                } else {
                    if (current) lines.push(current);
                    current = token;
                }
            }
            if (current) lines.push(current);
            return lines;
        };

        // w and h are the outer box; the text fits in the box less its padding.
        const innerFromOuter = (outer: number) => Math.max(0, outer - 2 * bgPad);
        const innerCap = TEXT_MAX_AUTO - 2 * bgPad;

        let innerW: number;
        let lines: string[];
        if (!wAuto) {
            innerW = innerFromOuter(rawW);
            lines = wrap(Math.floor(innerW / charW));
        } else if (!hAuto) {
            // Fixed height: widen until the text fits in the lines that fit.
            const maxLines = Math.max(1, Math.floor(innerFromOuter(rawH) / lineHeight));
            let cpl = Math.max(1, Math.ceil(text.length / maxLines));
            lines = wrap(cpl);
            while (lines.length > maxLines && cpl < text.length) {
                cpl += 1;
                lines = wrap(cpl);
            }
            innerW = lines.reduce((m, l) => Math.max(m, l.length), 1) * charW;
        } else {
            // Both auto: at most `TEXT_MAX_AUTO` wide, shrunk to the longest line.
            lines = wrap(Math.floor(innerCap / charW));
            innerW = Math.min(innerCap, lines.reduce((m, l) => Math.max(m, l.length), 1) * charW);
        }

        // Lines that don't fit a fixed or capped height are dropped.
        let innerH: number;
        if (!hAuto) {
            innerH = innerFromOuter(rawH);
            lines = lines.slice(0, Math.max(1, Math.floor(innerH / lineHeight)));
        } else if (!wAuto) {
            innerH = lines.length * lineHeight;
        } else {
            lines = lines.slice(0, Math.max(1, Math.floor(innerCap / lineHeight)));
            innerH = lines.length * lineHeight;
        }

        const outerW = wAuto ? innerW + 2 * bgPad : rawW;
        const outerH = hAuto ? innerH + 2 * bgPad : rawH;
        return { boxed: true, fs, lineHeight, lines, outerW, outerH };
    }

    const bgPad = 4 / unit;
    return {
        boxed: false, fs, lineHeight, lines: [text],
        outerW: text.length * 0.55 * fs + 2 * bgPad,
        outerH: lineHeight + 2 * bgPad,
    };
}

// Centered at (x, y). Not drawn without both. A box gets the page background and a border in the text's color.
const renderText = (text: Accessor<TextNode>, unit: Accessor<number>) => {
    const box = () => {
        const t = text();
        if (!t.x || !t.y) return null;
        const layout = textLayout(t, unit());
        const cx = num(t.x.value), cy = num(t.y.value);
        // y grows upward: the first line is the highest.
        const firstY = cy + (layout.lines.length * layout.lineHeight) / 2 - layout.lineHeight / 2;
        // `stroke` colors the text and the border; `fill` isn't used.
        return { ...layout, cx, cy, firstY, color: t.stroke ?? COLOR };
    };

    return (
        <Show when={box()}>
            {(b) => (
                <>
                    {/* Unboxed, it is invisible: it only catches the hover. */}
                    <rect
                        x={b().cx - b().outerW / 2} y={b().cy - b().outerH / 2}
                        width={b().outerW} height={b().outerH} rx={(b().boxed ? 6 : 2) / unit()}
                        style={{ fill: PAGE_BACKGROUND, 'fill-opacity': b().boxed ? 1 : 0 }}
                        stroke={b().boxed ? b().color : 'none'} stroke-width={1} vector-effect="non-scaling-stroke"
                    />
                    <For each={b().lines}>
                        {(line, i) => (
                            // scale(1, -1) undoes CenteredGrid's flip, so the text is upright.
                            <g transform={`translate(${b().cx}, ${b().firstY - i() * b().lineHeight}) scale(1, -1)`}>
                                <text x={0} y={0} font-size={`${b().fs}`} text-anchor="middle" dominant-baseline="central" fill={b().color}>
                                    {line}
                                </text>
                            </g>
                        )}
                    </For>
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
    renderText,
};
