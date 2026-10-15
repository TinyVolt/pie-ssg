import { createMemo, createRoot } from 'solid-js';
import { getFunction } from './functions/registry';
import { NodeReconciler, ParameterDefinition } from './functions/Node2NodeFunc';
import { NodeStore } from './state/NodeStore';
import { AnyNode, NodeType, ScalarNode, TextNode } from './state/Node';
import { scalar } from './jax';

/** One argument of a Python call: a number, a string, or a handle to an existing node. */
export type Arg = number | string | { id: string };

export interface ExecuteResult {
  id: string;
  type: string;
}

function saveLiteral(store: NodeStore, node: AnyNode): string {
  createRoot((dispose) => {
    store.saveNode(node.id, createMemo(() => node), dispose);
  });
  return node.id;
}

/** What an argument is, before any node is created for it. */
function argType(arg: Arg, store: NodeStore): string {
  if (typeof arg === 'number') return 'Scalar';
  if (typeof arg === 'string') return 'Text';
  const node = store.getNodeValue(arg.id);
  if (!node) throw new Error(`Unknown node '${arg.id}'`);
  return node.type;
}

/** A number or string gets one hidden node, reused by every call that passes the same value. */
function resolveArg(arg: Arg, store: NodeStore): string {
  if (typeof arg === 'object') return arg.id;
  const id = typeof arg === 'number' ? `_literal_num_${arg}` : `_literal_str_${arg}`;
  if (store.getNodeValue(id)) return id;
  if (typeof arg === 'number') {
    return saveLiteral(store, { id, type: 'Scalar', value: scalar(arg) } as ScalarNode);
  }
  return saveLiteral(store, { id, type: 'Text', value: arg } as TextNode);
}

/** `out` is the id for the output node. Without it the id is generated. */
export async function execute(store: NodeStore, keyword: string, args: Arg[], out?: string): Promise<ExecuteResult> {
  const func = getFunction(keyword);
  if (!func) {
    throw new Error(`Unknown function: ${keyword}`);
  }

  const expected = func.parameters.length;
  if (args.length !== expected) {
    const names = func.parameters.map((p: ParameterDefinition) => p.name).join(', ');
    throw new Error(`${keyword} needs exactly ${expected} argument${expected === 1 ? '' : 's'} (${names}), got ${args.length}`);
  }

  // Check every type first, so a bad call leaves no literal nodes behind.
  args.forEach((arg, i) => {
    const param = func.parameters[i];
    const types = Array.isArray(param.type) ? param.type : [param.type];
    const got = argType(arg, store);
    if (!types.includes(got as NodeType)) {
      throw new Error(`${keyword}: expected ${types.join(' or ')} but got ${got} for argument '${param.name}'`);
    }
  });

  if (out !== undefined) {
    if (typeof out !== 'string' || out === '') {
      throw new Error(`${keyword}: out must be a non-empty string`);
    }
    // Ids starting with '_' are kept for the hidden number and text nodes.
    if (out.startsWith('_')) {
      throw new Error(`${keyword}: out must not start with '_'`);
    }
    // A node that is its own input would update forever.
    if (args.some(arg => typeof arg === 'object' && arg.id === out)) {
      throw new Error(`${keyword}: out='${out}' is also an input`);
    }
  }

  const inputNodeIds = args.map(arg => resolveArg(arg, store));

  const outputType = func.resolveOutputType?.(inputNodeIds.map(id => store.getNodeValue(id)!)) ?? func.outputType;
  const id = out ?? store.nameGenerator.generateAutoName(store.nameGenerator.getPrefixForType(outputType));
  new NodeReconciler().evaluate(func, inputNodeIds, store, id);

  return { id, type: store.getNodeValue(id)?.type ?? func.outputType };
}
