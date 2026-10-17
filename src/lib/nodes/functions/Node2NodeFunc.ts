import { NodeType } from '../state/Node';
import { batch, createComputed, createMemo, createRoot, onCleanup } from 'solid-js';
import { AnyNode } from '../state/Node';
import { NodeStore } from '../state/NodeStore';
import { computeBlueprint } from '../tensors/broadcast';

export interface ParameterDefinition {
  name: string;
  /** A list means any one of these types is accepted. */
  type: NodeType | NodeType[];
}

export type BlueprintNode = any;

/**
 * How long a reactive recompute error may persist before it is reported.
 */
const TRANSIENT_ERROR_GRACE_MS = 500;

export interface Node2NodeFunc {
  keyword: string;
  outputType: NodeType;
  /** For a function whose output type depends on its inputs. Used to name the output. */
  resolveOutputType?: (inputs: AnyNode[]) => NodeType;
  parameters: ParameterDefinition[];
  /** False: passing an array is an error instead of a loop over its items. Default true. */
  broadcastable?: boolean;
  compute: (inputs: AnyNode[]) => Record<string, BlueprintNode>;
}

type LocalMeta = {
  globalId: string;
  disposeNode: () => void;
  initialized: boolean;
}

export class NodeReconciler {

  /**
   * `resolveReference`
   * When the dep has an allocated id but hasn't been saved yet, we return the original
   * static value. `getNodeValue` is reactive, so the enclosing memo re-runs automatically
   * once the dep is saved, upgrading the static reference to the live node.
   *
   * `blueprintIndex` maps each blueprint object to its local key, so finding the
   * key that owns `item` is a hash lookup.
   */
  private resolveReference(
    item: any,
    localKey: string,
    localToGlobal: Map<string, LocalMeta>,
    blueprintIndex: Map<object, string>,
    store: NodeStore
  ): { node: any; missing: boolean } | null {
    if (typeof item !== 'object' || item === null) return null;

    const otherLocalKey = blueprintIndex.get(item);
    if (otherLocalKey === undefined || otherLocalKey === localKey) return null;
    const foundMeta = localToGlobal.get(otherLocalKey);
    if (!foundMeta) return null;

    const globalNode = store.getNodeValue(foundMeta.globalId);
    if (globalNode) return { node: globalNode, missing: false };

    // Not in store: either not-yet-saved (keep static) or deleted (cascade)
    return { node: item, missing: foundMeta.initialized };
  }

  /**
   * Index every top-level blueprint object by identity, so `resolveReference` is
   * O(1). First-wins on key order.
   */
  private buildBlueprintIndex(blueprint: Record<string, BlueprintNode> | null): Map<object, string> {
    const index = new Map<object, string>();
    if (!blueprint) return index;
    for (const key in blueprint) {
      const value = blueprint[key];
      if (value && typeof value === 'object' && !index.has(value)) index.set(value, key);
    }
    return index;
  }

  /**
   * Walks the node's properties and rewrites any static blueprint references to
   * reactive lookups via `getNodeValue`. Mutates `transformedData` in place.
   *
   * Example: `ellipse_from_foci` yields an ellipse whose `center` is a static
   * point object that is also a blueprint entry of its own. This rewrites it to
   * the global reactive node for that point.
   */
  private linkBlueprintReferences(
    localKey: string,
    transformedData: AnyNode,
    localToGlobal: Map<string, LocalMeta>,
    blueprintIndex: Map<object, string>,
    store: NodeStore
  ): { hasMissingDependency: boolean } {
    let hasMissingDependency = false;

    for (const key in transformedData) {
      const value = transformedData[key as keyof AnyNode];
      if (typeof value !== 'object' || value === null) continue;

      if (Array.isArray(value)) {
        (transformedData as any)[key] = (value as any[]).map((item: any) => {
          const resolved = this.resolveReference(item, localKey, localToGlobal, blueprintIndex, store);
          if (!resolved) return item;
          if (resolved.missing) hasMissingDependency = true;
          return resolved.node;
        });
      } else {
        const resolved = this.resolveReference(value, localKey, localToGlobal, blueprintIndex, store);
        if (!resolved) continue;
        if (resolved.missing) hasMissingDependency = true;
        (transformedData as any)[key] = resolved.node;
      }
    }

    return { hasMissingDependency };
  }

  evaluate(func: Node2NodeFunc, inputNodeIds: string[], store: NodeStore, assignedId?: string) {
    createRoot((disposeRoot) => {
      const localToGlobal = new Map<string, LocalMeta>();

      // A compute error during recompute keeps the previous blueprint instead of
      // escaping mid-propagation. It is reported only if it persists past the
      // grace window.
      let firstRunDone = false;
      let graceTimer: ReturnType<typeof setTimeout> | undefined;
      let lastErrorMessage = '';
      onCleanup(() => { if (graceTimer !== undefined) clearTimeout(graceTimer); });

      // The inputs the current blueprint was computed from. Set together with the
      // blueprint, so a kept previous blueprint keeps its own inputs.
      let blueprintInputs: AnyNode[] = [];

      const blueprintMemo = createMemo<Record<string, BlueprintNode> | null>((prev) => {
        const inputs = inputNodeIds.map(id => store.getNodeValue(id));
        if (inputs.some(node => !node || node.type === 'Dummy')) return null;
        try {
          const blueprint = computeBlueprint(func, inputs as AnyNode[]);
          blueprintInputs = inputs as AnyNode[];
          if (graceTimer !== undefined) {
            clearTimeout(graceTimer);
            graceTimer = undefined;
          }
          return blueprint;
        } catch (err) {
          // First run happens at call time — let the caller report it.
          if (!firstRunDone) throw err;
          lastErrorMessage = err instanceof Error ? err.message : String(err);
          if (graceTimer === undefined) {
            graceTimer = setTimeout(() => {
              graceTimer = undefined;
              console.error(`${func.keyword}: ${lastErrorMessage}`);
            }, TRANSIENT_ERROR_GRACE_MS);
          }
          return prev;
        }
      }, null);
      firstRunDone = true;

      this.reconcile(blueprintMemo, () => blueprintInputs, localToGlobal, func, assignedId, store, disposeRoot);
    }) // outer `createRoot` ends here
  }

  private reconcile(
    blueprintAccessor: () => Record<string, BlueprintNode> | null,
    inputsAccessor: () => AnyNode[],
    localToGlobal: Map<string, LocalMeta>,
    func: Node2NodeFunc,
    assignedId: string | undefined,
    store: NodeStore,
    disposeRoot: () => void
  ) {
    // One identity index per blueprint value, shared by every node memo below.
    const blueprintIndex = createMemo(() => this.buildBlueprintIndex(blueprintAccessor()));

    createComputed(() => {
      const blueprint = blueprintAccessor();
      const currentKeys = blueprint ? new Set<string>(Object.keys(blueprint)) : new Set<string>();

      // Phase A: create missing nodes
      if (blueprint) {
        const newlyAddedKeys: string[] = [];
        for (const localKey of currentKeys) {
          if (!localToGlobal.has(localKey)) {
            const isMain = localKey === 'main';
            const nodeData = blueprint[localKey];
            const autoNamePrefix = store.nameGenerator.getPrefixForType(nodeData.type);

            const globalId = isMain && assignedId ? assignedId : store.nameGenerator.generateAutoName(autoNamePrefix);

            localToGlobal.set(localKey, { globalId, disposeNode: () => { }, initialized: false });
            newlyAddedKeys.push(localKey);
          }
        }

        // Phase A2: build reactive roots and save each node to the global store.
        batch(() => {
          for (const localKey of newlyAddedKeys) {
            const meta = localToGlobal.get(localKey)!;
            const { globalId } = meta;
            const isMain = localKey === 'main';

            createRoot((disposeNode) => {
              meta.disposeNode = disposeNode;

              const nodeSignal = createMemo(() => {
                const latestBlueprint = blueprintAccessor();
                if (!latestBlueprint) return { id: globalId, type: 'Dummy' } as unknown as AnyNode;
                const data = latestBlueprint[localKey];
                // Guard against the reconciler not yet having disposed this node
                // after the blueprint shrank.
                if (!data) return { id: globalId, type: 'Dummy' } as unknown as AnyNode;

                const transformedData = {
                  ...data,
                  id: globalId,
                  __graph_deps: {
                    funcKeyword: func.keyword,
                    inputNodes: inputsAccessor(),
                    blueprintKey: localKey,
                    ...(localKey !== 'main' ? { parentId: localToGlobal.get('main')?.globalId } : {})
                  }
                } as AnyNode;

                const { hasMissingDependency } = this.linkBlueprintReferences(
                  localKey, transformedData, localToGlobal, blueprintIndex(), store
                );

                if (hasMissingDependency) {
                  queueMicrotask(() => {
                    if (store.getNodeValue(globalId)) store.removeNode(globalId);
                  });
                  return { id: globalId, type: 'Dummy' } as unknown as AnyNode;
                }

                return transformedData;
              });

              const customDispose = () => {
                disposeNode();
                if (isMain) {
                  for (const [otherLocalKey, otherMeta] of localToGlobal.entries()) {
                    if (otherLocalKey !== localKey && store.getNodeValue(otherMeta.globalId)) {
                      store.removeNode(otherMeta.globalId);
                    }
                  }
                  disposeRoot();
                }
              };

              store.saveNode(globalId, nodeSignal, customDispose);
              meta.initialized = true;
            });
          }
        }); // `batch` ends here
      } // `if (blueprint)` ends here

      // Phase B: clean up removed nodes
      for (const [localKey, meta] of localToGlobal.entries()) {
        if (!currentKeys.has(localKey)) {
          if (store.getNodeValue(meta.globalId)) {
            store.removeNode(meta.globalId);
          }
          localToGlobal.delete(localKey);
        }
      }

      if (!blueprint) {
        disposeRoot();
      }
    }); // `createComputed` ends here
  }
}
