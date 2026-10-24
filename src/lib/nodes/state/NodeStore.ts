import { Accessor, batch, createMemo, createRoot, createSignal, untrack } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { AnyNode, ScalarNode, TextNode } from './Node';
import { NameGenerator } from './NameGenerator';
import { num, scalar } from '../jax';

/** Below this many pixels per unit, the grid hides its lines and keeps only the axes. */
export const MIN_GRID_UNIT = 20;

export type NodeSignal = {
  signal: Accessor<AnyNode>;
  dispose?: () => void;
};

export class NodeStore {
  public nodes: Record<string, NodeSignal>;
  public setNodes: (id: string, value: NodeSignal | undefined) => void;
  public reconcileNodes: (value: Record<string, NodeSignal>) => void;

  public canvasBounds: Accessor<{ width: number; height: number }>;
  public setCanvasBounds: (bounds: { width: number; height: number }) => void;

  /** Pixels per grid unit, read from the `unit` node. */
  public unit!: Accessor<number>;
  /** Opacity multiplier for the grid lines and axes, read from the `gridOpacity` node. */
  public gridOpacity!: Accessor<number>;
  /** Canvas background color, read from the `canvasColor` node. `undefined` when empty: no background. */
  public canvasColor!: Accessor<string | undefined>;

  public nameGenerator: NameGenerator;

  constructor() {
    const [nodesState, setNodesState] = createStore<Record<string, NodeSignal>>({});
    this.nodes = nodesState;
    this.setNodes = (id, value) => { setNodesState(id, value as any); };
    this.reconcileNodes = (value) => { setNodesState(reconcile(value)); };

    const [canvasBounds, setCanvasBounds] = createSignal({ width: 500, height: 500 });
    this.canvasBounds = canvasBounds;
    this.setCanvasBounds = setCanvasBounds;

    createRoot(() => {
      this.unit = createMemo(() => {
        const node = this.nodes['unit']?.signal() as ScalarNode | undefined;
        // max(1, ...): a zero, negative or NaN unit would break the viewBox.
        return node ? Math.max(1, num(node.value)) : 50;
      });

      this.gridOpacity = createMemo(() => {
        const node = this.nodes['gridOpacity']?.signal() as ScalarNode | undefined;
        return node ? num(node.value) : 1;
      });

      this.canvasColor = createMemo(() => {
        const node = this.nodes['canvasColor']?.signal() as TextNode | undefined;
        return node?.value?.trim() || undefined;
      });
    });

    // untrack: names are generated inside reactive computations, which must not rerun when the checked node changes.
    this.nameGenerator = new NameGenerator((name) => untrack(() => this.nodes[name] !== undefined));

    this.initSystemNodes();
  }

  public initSystemNodes() {
    const unitId = 'unit';
    createRoot((dispose) => {
      const signal = createMemo(() => ({ id: unitId, type: 'Scalar', value: scalar(50) } as ScalarNode));
      this.saveNode(unitId, signal, dispose);
    });

    const gridOpacityId = 'gridOpacity';
    createRoot((dispose) => {
      const signal = createMemo(() => ({ id: gridOpacityId, type: 'Scalar', value: scalar(1) } as ScalarNode));
      this.saveNode(gridOpacityId, signal, dispose);
    });

    const canvasColorId = 'canvasColor';
    createRoot((dispose) => {
      const signal = createMemo(() => ({ id: canvasColorId, type: 'Text', value: '' } as TextNode));
      this.saveNode(canvasColorId, signal, dispose);
    });
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

    this.initSystemNodes();
  }

  public saveNode(id: string, signal: Accessor<AnyNode>, dispose?: () => void) {
    if (this.nodes[id] && typeof this.nodes[id].dispose === 'function') {
      this.nodes[id].dispose!();
    }
    this.setNodes(id, { signal, dispose });
  }

  /** Sets `props` on node `id`. Unlike `saveNode`, the node keeps following its inputs. */
  public updateNode(id: string, props: Partial<AnyNode>) {
    // Read out now: `setNodes` merges into the stored entry, so it would overwrite them.
    const { signal: oldSignal, dispose: oldDispose } = this.nodes[id];
    createRoot((dispose) => {
      const signal = createMemo(() => ({ ...oldSignal(), ...props } as AnyNode));
      // Not `saveNode`: that would dispose the old node, which the new one reads.
      this.setNodes(id, { signal, dispose: () => { dispose(); oldDispose?.(); } });
    });
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
