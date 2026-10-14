import { For, createMemo, JSX } from 'solid-js';
import { NodeStore, type NodeSignal } from '../state/NodeStore';
import { renderNode } from '../render/renderLogic';
import { CenteredGrid } from './CenteredGrid';

/** The canvas always shows -VIEW_EXTENT..VIEW_EXTENT on both axes. */
const VIEW_EXTENT = 10;

interface NodeCanvasProps {
  store: NodeStore;
}

export function NodeCanvas(props: NodeCanvasProps): JSX.Element {
  // One pass over the store, partitioned into the two draw layers.
  const layers = createMemo(() => {
    const geometry: NodeSignal[] = [];
    const points: NodeSignal[] = [];
    for (const nodeSignal of Object.values(props.store.nodes)) {
      if (!nodeSignal) continue;
      const node = nodeSignal.signal();
      if (!node || node.type === 'Dummy') continue;
      if (node.type === 'Point') points.push(nodeSignal);
      else geometry.push(nodeSignal);
    }
    return { geometry, points };
  });

  const nodeGroup = (nodeSignal: NodeSignal) => {
    const node = createMemo(() => nodeSignal?.signal());
    // The element is rebuilt only when the type changes.
    const type = createMemo(() => node()?.type);
    return (
      <g data-node-id={node()?.id}>
        {type() && renderNode(type()!, node)}
      </g>
    );
  };

  return (
    <svg viewBox={`${-VIEW_EXTENT} ${-VIEW_EXTENT} ${2 * VIEW_EXTENT} ${2 * VIEW_EXTENT}`}>
      <CenteredGrid extent={VIEW_EXTENT}>
        {/* Step 1: Draw non-`Point` nodes first */}
        <For each={layers().geometry}>{(nodeSignal) => nodeGroup(nodeSignal)}</For>
        {/* Step 2: Draw `Point` nodes above geometry */}
        <For each={layers().points}>{(nodeSignal) => nodeGroup(nodeSignal)}</For>
      </CenteredGrid>
    </svg>
  );
}
