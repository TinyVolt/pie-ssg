import { createMemo, onCleanup, Show } from 'solid-js';
import { isServer } from 'solid-js/web';
import 'katex/dist/katex.min.css';
import { setCustomModules, type CustomModules } from '~/lib/customModules';
import type { Page } from '../compile';
import { wrapPage } from '../features/views';
import { CanvasPage } from './CanvasPage';

// Custom modules are global, so only one PiePage can use them at a time.
let mounted = false;

/** Sets `modules` until the calling component is cleaned up. */
function useModules(modules: CustomModules) {
  if (mounted) throw new Error('Only one PiePage can be mounted at a time');
  setCustomModules(modules);
  mounted = true;
  onCleanup(() => {
    setCustomModules({});
    mounted = false;
  });
}

/**
 * A page from `compilePie`, shown as a pie site shows it, in a `.pie-page` box that fills its parent.
 * `modules`: the host's own functions, node types and UIs. `css`: author CSS, limited to the page.
 * A new `page`, `modules` or `css` starts a fresh canvas and fresh Python variables.
 * Throws on a name used twice in `modules`, or when another PiePage is mounted.
 */
export function PiePage(props: { page: Page; modules?: CustomModules; css?: string }) {
  const current = createMemo(() => ({ page: props.page, modules: props.modules, css: props.css }));

  return (
    <div class="pie-page">
      <Show when={current()} keyed>
        {({ page, modules, css }) => {
          // Only in the browser: the server draws no nodes and runs no Python, and every request would share its modules.
          if (!isServer) useModules(modules ?? {});
          return (
            <>
              {css && <style>{`.pie-page {\n${css}\n}`}</style>}
              {wrapPage(page.features, <CanvasPage side={page.frontmatter.canvas} html={page.html} />)}
            </>
          );
        }}
      </Show>
    </div>
  );
}
