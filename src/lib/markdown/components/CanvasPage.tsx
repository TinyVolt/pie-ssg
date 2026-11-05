import { SplitPane } from '~/components/SplitPane';
import { NodeCanvas } from '~/lib/nodes/components/NodeCanvas';
import { NodeStore } from '~/lib/nodes/state/NodeStore';
import { UiLayer } from '~/lib/ui/UiLayer';
import type { CanvasSide } from '../frontmatter';
import { MarkdownBody } from './MarkdownBody';

/**
 * A canvas on `side` of the page's text. `python-editor` blocks in the text draw on it.
 * `none`: the canvas starts collapsed, on the right.
 */
export function CanvasPage(props: { side: CanvasSide; html: string }) {
  const store = props.side === 'none' ? new NodeStore('right', 'first') : new NodeStore(props.side, 'none');

  return (
    <SplitPane
      class="canvas-page"
      side={store.canvasSide()}
      collapsed={store.collapsedPane()}
      setCollapsed={store.setCollapsedPane}
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
