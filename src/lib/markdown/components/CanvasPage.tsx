import { SplitPane } from '~/components/SplitPane';
import { NodeCanvas } from '~/lib/nodes/components/NodeCanvas';
import { NodeStore } from '~/lib/nodes/state/NodeStore';
import { UiLayer } from '~/lib/ui/UiLayer';
import type { CanvasSide } from '../frontmatter';
import { MarkdownBody } from './MarkdownBody';

/** A canvas on `side` of the page's text. `python-editor` blocks in the text draw on it. */
export function CanvasPage(props: { side: Exclude<CanvasSide, 'none'>; html: string }) {
  const store = new NodeStore();

  return (
    <SplitPane
      class="canvas-page"
      side={props.side}
      first={
        <div class="canvas-page-canvas">
          <NodeCanvas store={store} />
          <UiLayer />
        </div>
      }
      second={<MarkdownBody class="canvas-page-text" html={props.html} store={store} />}
      firstLabel="canvas"
      secondLabel="text"
    />
  );
}
