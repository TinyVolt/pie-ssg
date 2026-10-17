import { Node2NodeFunc } from './Node2NodeFunc';
import { getFunction } from './registry';
import { AnyNode, ScalarNode } from '../state/Node';
import { ref, Dtype } from '../jax';
import { Graph, replay, gradient } from '~/lib/autodiff';
import { computeBlueprint } from '../tensors/broadcast';

/** The number fields of each node type `partial` can differentiate with respect to. */
const NUMBER_FIELDS: Record<string, string[]> = { Scalar: ['value'], Point: ['x', 'y'] };

/** Nodes as an autodiff graph: each node carries its input nodes in `__graph_deps`. */
const nodeGraph: Graph<AnyNode> = {
  id: (node) => node.id,
  inputs: (node) => node.__graph_deps?.inputNodes,
  recompute(node, inputs) {
    const deps = node.__graph_deps!;
    const func = getFunction(deps.funcKeyword);
    if (!func) throw new Error(`Unknown function: ${deps.funcKeyword}`);
    const key = deps.blueprintKey ?? 'main';
    const data = computeBlueprint(func, inputs)[key];
    if (!data) throw new Error(`${deps.funcKeyword} gave no '${key}' output`);
    return { ...data, id: node.id, __graph_deps: { ...deps, inputNodes: inputs } };
  },
};

/**
 * Partial derivative of a scalar with respect to a scalar or a point.
 * Composes: the target may itself be a `partial`.
 * @param target - Scalar to differentiate
 * @param var - Scalar or Point to differentiate with respect to. Its own inputs are ignored.
 * @returns Scalar (var is a Scalar) or PointGrad (var is a Point)
 * @auxiliaryNodes None
 */
export const Partial: Node2NodeFunc = {
  keyword: 'partial', 
  outputType: 'Scalar',
  resolveOutputType: (inputs) => (inputs[1].type === 'Point' ? 'PointGrad' : 'Scalar'),
  broadcastable: false,
  parameters: [{ name: 'target', type: 'Scalar' }, { name: 'var', type: ['Scalar', 'Point'] }],
  compute(inputs) {
    const target = inputs[0] as ScalarNode;
    const v = inputs[1];
    if (v.id.startsWith('_literal_')) {
      throw new Error('partial: var must be a node, not a number');
    }

    const fields = NUMBER_FIELDS[v.type];
    // The variable with new values and no inputs, so the replay stops at it.
    const varAt = (values: Dtype[]) => ({
      ...v, ...Object.fromEntries(fields.map((field, i) => [field, values[i]])), __graph_deps: undefined,
    }) as AnyNode;
    const f = (...values: Dtype[]) => ref((replay(nodeGraph, target, v.id, varAt(values)) as ScalarNode).value);
    const grads = gradient(f, fields.map(field => ref((v as any)[field])));

    if (v.type === 'Scalar') return { main: { type: 'Scalar', value: grads[0] } };
    return { main: { type: 'PointGrad', point: v, target, dx: grads[0], dy: grads[1] } };
  },
};

/** Docs category for the functions defined in this file. */
export const category = 'Autodiff';
