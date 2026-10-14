import { Accessor, batch, untrack } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { AnyNode } from './Node';
import { NameGenerator } from './NameGenerator';

export type NodeSignal = {
  signal: Accessor<AnyNode>;
  dispose?: () => void;
};

export class NodeStore {
  public nodes: Record<string, NodeSignal>;
  public setNodes: (id: string, value: NodeSignal | undefined) => void;
  public reconcileNodes: (value: Record<string, NodeSignal>) => void;

  public nameGenerator: NameGenerator;

  constructor() {
    const [nodesState, setNodesState] = createStore<Record<string, NodeSignal>>({});
    this.nodes = nodesState;
    this.setNodes = (id, value) => { setNodesState(id, value as any); };
    this.reconcileNodes = (value) => { setNodesState(reconcile(value)); };

    // untrack: names are generated inside reactive computations, which must not rerun when the checked node changes.
    this.nameGenerator = new NameGenerator((name) => untrack(() => this.nodes[name] !== undefined));
  }

  public clearNodes() {
    batch(() => {
      for (const key in this.nodes) {
        if (this.nodes[key] && typeof this.nodes[key].dispose === 'function') {
          this.nodes[key].dispose!();
        }
      }
      this.reconcileNodes({});
      this.nameGenerator.resetCounters();
    });
  }

  public saveNode(id: string, signal: Accessor<AnyNode>, dispose?: () => void) {
    if (this.nodes[id] && typeof this.nodes[id].dispose === 'function') {
      this.nodes[id].dispose!();
    }
    this.setNodes(id, { signal, dispose });
  }

  public getNodeValue(id: string): AnyNode | undefined {
    return this.nodes[id]?.signal();
  }

  public removeNode(id: string) {
    const nodeSignal = this.nodes[id];
    if (nodeSignal) {
      this.setNodes(id, undefined);

      if (typeof nodeSignal.dispose === 'function') {
        queueMicrotask(() => {
          if (nodeSignal.dispose) {
            nodeSignal.dispose();
          }
        });
      }
    }
  }
}
