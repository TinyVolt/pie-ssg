import { createComponent } from 'solid-js';
import { render } from 'solid-js/web';
import type { Page } from '~/lib/markdown/compile';
import { holdCustomModules, type CustomModules } from '~/lib/customModules';
import { NodeStore } from '~/lib/nodes/state/NodeStore';
import { checkUi, UiView, type UiCall } from '~/lib/ui/UiView';
import { PythonRunner, PythonScope } from './runner';

export interface RunPageOptions {
  /** Stop after this many milliseconds in total, including loading Python. Default 30000. */
  timeoutMs?: number;
  /** The host's own functions, node types and UIs, as `<PiePage modules>` takes them. */
  modules?: CustomModules;
}

/** One block that ran. */
export interface BlockResult {
  /** What the block printed. */
  output: string;
  /** The Python error, or `Timed out after N s`. Unset when the block ran without one. */
  error?: string;
}

/** The worker every `runPage` call uses. Kept between calls, so Pyodide loads once; a timeout kills it. */
const runner = new PythonRunner();

// The last call: each call waits for it, so a timeout kills only its own blocks.
let previous: Promise<unknown> = Promise.resolve();

/** Draws the UI out of sight, and throws the error it would show in its place. */
function drawUi(store: NodeStore, call: UiCall) {
  const box = document.createElement('div');
  const dispose = render(() => createComponent(UiView, { store, call }), box);
  const error = box.querySelector('.python-editor-error')?.textContent;
  dispose();
  if (error) throw new Error(error);
}

/**
 * Runs `page`'s `python-editor` blocks in order, as a reader clicking Run on each would, without showing them.
 * Stops at the first block with an error. Runs in a Python worker of its own, apart from the pages'.
 * Calls run one at a time. Rejects when a mounted PiePage has other `modules`.
 */
export function runPage(page: Page, options: RunPageOptions = {}): Promise<BlockResult[]> {
  const result = previous.then(() => run(page, options));
  previous = result.catch(() => {});
  return result;
}

async function run(page: Page, { timeoutMs = 30_000, modules = {} }: RunPageOptions): Promise<BlockResult[]> {
  const doc = new DOMParser().parseFromString(page.html, 'text/html');
  // The blocks `MarkdownBody` turns into editors.
  const codes = Array.from(doc.querySelectorAll('pre > code.language-python-editor'), (el) => el.textContent ?? '');

  const release = holdCustomModules(modules, "runPage: modules differ from the open PiePage's");
  const store = new NodeStore('right', 'none');
  const scope = new PythonScope(store, runner);
  const results: BlockResult[] = [];
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    runner.kill();
  }, timeoutMs);

  try {
    for (const code of codes) {
      if (timedOut) break;
      const result: BlockResult = { output: '' };
      results.push(result);
      await new Promise<void>((resolve) => {
        scope.run(
          code,
          (status, error) => {
            if (status === 'finished') {
              if (error) result.error = error;
              resolve();
            } else if (status === 'killed') {
              result.error = `Timed out after ${timeoutMs / 1000} s`;
              resolve();
            }
          },
          (text) => {
            result.output += text;
          },
          () => {},
          // A thrown error raises in Python at the `pie.ui.*` call.
          (call) => {
            checkUi(store, call);
            drawUi(store, call);
          },
        );
      });
      if (result.error !== undefined) break;
    }
  } finally {
    clearTimeout(timer);
    // Frees the variables; the worker stays for the next call.
    scope.dispose();
    for (const id in store.nodes) store.nodes[id]?.dispose?.();
    release();
  }
  return results;
}
