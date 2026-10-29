import katex from 'katex';
import type { AnyNode } from '~/lib/nodes/state/Node';
import { num, type Dtype } from '~/lib/nodes/jax';
import { isHandle, type UiArg } from '../nodeHandle';

const fmt = (v: Dtype) => String(Number(num(v).toFixed(4)));

/** Rows of a 1D (a column) or 2D list of entries, as a bmatrix. */
function matrix(entries: string[], shape: number[]): string {
  if (shape.length > 2) throw new Error(`an array needs 1 or 2 dimensions, got shape [${shape.join(', ')}]`);
  const cols = shape[1] ?? 1;
  const rows = Array.from({ length: shape[0] }, (_, r) => entries.slice(r * cols, (r + 1) * cols).join(' & '));
  return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
}

function nodeTex(node: AnyNode): string {
  switch (node.type) {
    case 'Scalar': return fmt(node.value);
    case 'Point': return `\\left(${fmt(node.x)}, ${fmt(node.y)}\\right)`;
    // A Text holds LaTeX source.
    case 'Text': return node.value;
    case 'Array': return matrix(node.items.map(nodeTex), node.shape);
    default: throw new Error(`can't show a ${node.type}`);
  }
}

/** A list is shown like an Array: 1D as a column, 2D as a matrix. */
function argTex(arg: UiArg): string {
  if (isHandle(arg)) return nodeTex(arg[0]());
  if (arg.every(isHandle)) return matrix(arg.map(argTex), [arg.length]);
  if (arg.every((row) => !isHandle(row) && row.every(isHandle) && row.length === arg[0].length)) {
    return matrix(arg.flatMap((row) => (row as UiArg[]).map(argTex)), [arg.length, (arg[0] as UiArg[]).length]);
  }
  throw new Error('a list must be a list of nodes, or a list of equal-length lists of nodes');
}

/**
 * `pie.ui.latex(a, b, ...)`: the nodes as LaTeX, side by side. A Scalar shows its number, a Point (x, y),
 * a Text its value as LaTeX source, an Array of 1 or 2 dimensions a matrix.
 */
export function Latex(props: { args: UiArg[] }) {
  const html = () => katex.renderToString(props.args.map(argTex).join(' '), { throwOnError: false });
  return <span innerHTML={html()} />;
}
