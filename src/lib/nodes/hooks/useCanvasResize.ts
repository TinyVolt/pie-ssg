import { onMount, onCleanup } from 'solid-js';
import { NodeStore } from '../state/NodeStore';

export function useCanvasResize(svgContainerRef: () => HTMLDivElement | undefined, store: NodeStore) {
  let resizeObserver: ResizeObserver | undefined;

  const updateCanvasSize = () => {
    const container = svgContainerRef();
    if (container) {
      store.setCanvasBounds({
        width: container.clientWidth,
        height: container.clientHeight
      });
    }
  };

  onMount(() => {
    updateCanvasSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateCanvasSize);
    }
    // Observe the container directly so the canvas re-fits on any layout change
    // (e.g. dragging the split pane), not just window resizes.
    const container = svgContainerRef();
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateCanvasSize());
      resizeObserver.observe(container);
    }
  });

  onCleanup(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateCanvasSize);
    }
    resizeObserver?.disconnect();
  });
  return updateCanvasSize;
}
