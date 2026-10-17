import { Node2NodeFunc } from './Node2NodeFunc';
import { ArrayNode, TextNode } from '../state/Node';

/**
 * The items of an array that a slice picks, for Python's `ps[0:2]` or `ps[:, 1]`.
 * Hidden: `pie._index` is blocked, so it is only reached through `Array.__getitem__`.
 * @param array - Array to slice
 * @param key - JSON list with one entry per leading dimension: an index (the dimension is dropped) or a list of indices (the dimension is kept). Dimensions past the key are kept whole.
 * @returns Array node holding the existing item nodes
 * @auxiliaryNodes None
 */
export const Index: Node2NodeFunc = {
  keyword: '_index', outputType: 'Array',
  parameters: [{ name: 'array', type: 'Array' }, { name: 'key', type: 'Text' }],
  compute(inputs) {
    const array = inputs[0] as ArrayNode;
    const key: (number | number[])[] = JSON.parse((inputs[1] as TextNode).value);
    const picks = array.shape.map((size, d) => {
      const entry = key[d];
      if (entry === undefined) return [...Array(size).keys()];
      return typeof entry === 'number' ? [entry] : entry;
    });
    const shape = picks.filter((_, d) => typeof key[d] !== 'number').map(pick => pick.length);

    // Row-major positions in `array.items` of every picked item.
    let positions = [0];
    picks.forEach((pick, d) => {
      positions = positions.flatMap(position => pick.map(i => position * array.shape[d] + i));
    });

    return { main: { type: 'Array', itemType: array.itemType, shape, items: positions.map(p => array.items[p]) } };
  },
};

/** Docs category for the functions defined in this file. */
export const category = 'Arrays';
