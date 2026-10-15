import { grad, numpy as np } from '@jax-js/jax';

/**
 * How to walk a graph whose items carry their own inputs.
 * `inputs` gives undefined for an item that wasn't computed from others.
 */
export interface Graph<T> {
  id: (item: T) => string;
  inputs: (item: T) => T[] | undefined;
  /** Computes `item` again from new inputs. */
  recompute: (item: T, inputs: T[]) => T;
}

/**
 * `target` computed again, with the item whose id is `varId` swapped for
 * `replacement`. Items that don't read that item, directly or through others,
 * are returned as they are and not recomputed.
 */
export function replay<T>(graph: Graph<T>, target: T, varId: string, replacement: T): T {
  const done = new Map<string, T>();
  const visit = (item: T): T => {
    const id = graph.id(item);
    if (id === varId) return replacement;
    if (done.has(id)) return done.get(id)!;
    const inputs = graph.inputs(item);
    let result = item;
    if (inputs) {
      const newInputs = inputs.map(visit);
      if (newInputs.some((input, i) => input !== inputs[i])) result = graph.recompute(item, newInputs);
    }
    done.set(id, result);
    return result;
  };
  return visit(target);
}

/**
 * df/dxᵢ for each xᵢ in `xs`.
 *
 * jax-js frees an array once it is used. This uses up `xs` and whatever `f`
 * returns, so pass `.ref` copies of values you keep.
 *
 * Nesting works: `f` may itself call `gradient`. Any value the inner `f` reads
 * from an outer one must be captured by `f`, not passed in as an extra argument —
 * jax-js drops the gradient through arguments it is not differentiating.
 */
export function gradient(f: (...xs: np.Array[]) => np.Array, xs: np.Array[]): np.Array[] {
  return grad(f, { argnums: xs.map((_, i) => i) })(...xs);
}
