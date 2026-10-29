import { onCleanup, onMount } from 'solid-js';
import { clampToLayer, UI_LAYER_CLASS } from './dragUi';

/** A layer over the canvas for UIs dropped there. When the canvas resizes, they are kept inside it. */
export function UiLayer() {
  let layer!: HTMLDivElement;
  onMount(() => {
    const observer = new ResizeObserver(() => {
      for (const box of layer.children) clampToLayer(box as HTMLElement, layer);
    });
    observer.observe(layer);
    onCleanup(() => observer.disconnect());
  });
  return <div ref={layer} class={UI_LAYER_CLASS} />;
}
