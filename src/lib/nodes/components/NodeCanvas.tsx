import { For, createMemo, JSX } from 'solid-js';
import { NodeStore, type NodeSignal } from '../state/NodeStore';
import { getNodeDefinition } from '../state/Node';
import { CenteredGrid } from './CenteredGrid';
import { useCanvasResize } from '../hooks/useCanvasResize';
import { useCanvasGestures } from '../hooks/useCanvasGestures';

interface NodeCanvasProps {
  store: NodeStore;
}

export function NodeCanvas(props: NodeCanvasProps): JSX.Element {
  let svgContainerRef: HTMLDivElement | undefined;
  useCanvasResize(() => svgContainerRef, props.store);
  useCanvasGestures(() => svgContainerRef, props.store);

  // Canvas size in grid units: the viewBox maps one unit to `unit` pixels.
  const viewWidth = () => props.store.canvasBounds().width / props.store.unit();
  const viewHeight = () => props.store.canvasBounds().height / props.store.unit();

  // One pass over the store, partitioned into the two draw layers.
  const layers = createMemo(() => {
    const geometry: NodeSignal[] = [];
    const points: NodeSignal[] = [];
    for (const nodeSignal of Object.values(props.store.nodes)) {
      if (!nodeSignal) continue;
      const node = nodeSignal.signal();
      if (!node || node.type === 'Dummy' || node.hidden) continue;
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
        {/* The browser shows the `<title>` as a tooltip when hovering any shape in the group. */}
        <title>{node()?.id}</title>
        {type() && (getNodeDefinition(type()!)?.render?.(node, props.store.unit) ?? null)}
      </g>
    );
  };

  return (
    <div class="node-canvas" ref={svgContainerRef}>
      <svg viewBox={`0 0 ${viewWidth()} ${viewHeight()}`}>
        <CenteredGrid
          width={viewWidth()}
          height={viewHeight()}
          unit={props.store.unit()}
          gridOpacity={props.store.gridOpacity()}
          backgroundColor={props.store.canvasColor()}
          origin={props.store.origin()}
        >
          {/* Step 1: Draw non-`Point` nodes first */}
          <For each={layers().geometry}>{(nodeSignal) => nodeGroup(nodeSignal)}</For>
          {/* Step 2: Draw `Point` nodes above geometry */}
          <For each={layers().points}>{(nodeSignal) => nodeGroup(nodeSignal)}</For>
        </CenteredGrid>
      </svg>
    </div>
  );
}
