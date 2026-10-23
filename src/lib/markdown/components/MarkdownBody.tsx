import { onCleanup, onMount } from 'solid-js';
import { render } from 'solid-js/web';
import type { NodeStore } from '~/lib/nodes/state/NodeStore';
import { PythonScope } from '~/lib/python/runner';

const PYTHON_EDITOR_LANG = 'python-editor';

/**
 * Rendered markdown. On the client, each ```python-editor block becomes a runnable editor;
 * until then it shows as a plain code block. All editors on the page share Python variables.
 * `store`: the canvas their `pie.*` calls draw on.
 */
export function MarkdownBody(props: { html: string; store?: NodeStore; class?: string }) {
  let ref!: HTMLElement;

  onMount(() => {
    const blocks = ref.querySelectorAll<HTMLElement>(`pre > code.language-${PYTHON_EDITOR_LANG}`);
    if (blocks.length === 0) return;

    const scope = new PythonScope(props.store);
    const disposers: (() => void)[] = [];
    onCleanup(() => {
      disposers.forEach((dispose) => dispose());
      scope.dispose();
    });

    // Loaded only on pages that have an editor.
    import('./PythonEditor').then(({ PythonEditor }) => {
      blocks.forEach((codeEl) => {
        const pre = codeEl.parentElement!;
        if (!pre.isConnected) return;
        const code = codeEl.textContent ?? '';
        const collapsed = codeEl.hasAttribute('data-collapsed');
        const host = document.createElement('div');
        pre.replaceWith(host);
        disposers.push(render(() => <PythonEditor code={code} collapsed={collapsed} scope={scope} />, host));
      });
    });
  });

  return <main ref={ref} class={props.class} innerHTML={props.html} />;
}
