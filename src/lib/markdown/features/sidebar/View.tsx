import { createSignal, onCleanup, onMount, Show, type JSX } from 'solid-js';
import { Chevron } from '~/components/icons';
import { MarkdownBody } from '../../components/MarkdownBody';

// Used when `theme.css` doesn't set `--sidebar-drawer-below`.
const DRAWER_BELOW = '768px';

/**
 * `children` with a sidebar on the left showing `data`, the sidebar file's HTML. It starts collapsed; opening it squeezes `children`.
 * On screens narrower than `--sidebar-drawer-below`, it opens over the page instead,
 * and a tap outside it or on one of its links closes it.
 * Its Python editors share variables only with each other, and have no canvas.
 */
export function SidebarView(props: { data: string; children: JSX.Element }) {
  const [open, setOpen] = createSignal(false);
  const [drawer, setDrawer] = createSignal(false);

  onMount(() => {
    const below = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-drawer-below').trim() || DRAWER_BELOW;
    const query = matchMedia(`(width < ${below})`);
    const update = () => setDrawer(query.matches);
    update();
    query.addEventListener('change', update);
    onCleanup(() => query.removeEventListener('change', update));
  });

  // In the drawer, following a link closes it, even a link to a place on this page.
  const closeOnLink = (e: MouseEvent) => {
    if (drawer() && (e.target as Element).closest('a')) setOpen(false);
  };
  const label = () => (open() ? 'Hide sidebar' : 'Show sidebar');

  return (
    <div class="sidebar-page" classList={{ 'sidebar-page--open': open(), 'sidebar-page--drawer': drawer() }}>
      <aside id="sidebar" class="sidebar" onClick={closeOnLink}>
        <MarkdownBody class="sidebar-text" html={props.data} />
      </aside>
      <div class="sidebar-edge">
        <button
          class="sidebar-toggle"
          onClick={() => setOpen(!open())}
          aria-expanded={open()}
          aria-controls="sidebar"
          aria-label={label()}
          title={label()}
        >
          <Chevron direction={open() ? 'left' : 'right'} />
        </button>
      </div>
      <Show when={drawer() && open()}>
        <div class="sidebar-backdrop" onClick={() => setOpen(false)} />
      </Show>
      <div class="sidebar-page-content">{props.children}</div>
    </div>
  );
}
