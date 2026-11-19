import type { Page } from '~/lib/markdown/compile';
import { holdCustomModules, type CustomModules } from '~/lib/customModules';
import { NodeStore } from '~/lib/nodes/state/NodeStore';
import { checkUi } from '~/lib/ui/UiView';
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

/**
 * Runs `page`'s `python-editor` blocks in order, as a reader clicking Run on each would, without showing them.
 * Stops at the first block with an error. Runs in its own Python worker, which it terminates at the end.
 * Rejects when a mounted PiePage has other `modules`.
 */
export async function runPage(page: Page, { timeoutMs = 30_000, modules = {} }: RunPageOptions = {}): Promise<BlockResult[]> {
  const doc = new DOMParser().parseFromString(page.html, 'text/html');
  // The blocks `MarkdownBody` turns into editors.
  const codes = Array.from(doc.querySelectorAll('pre > code.language-python-editor'), (el) => el.textContent ?? '');

  const release = holdCustomModules(modules, "runPage: modules differ from the open PiePage's");
  const runner = new PythonRunner();
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
          // Raises in Python as on a page; the UI isn't drawn.
          (call) => checkUi(store, call),
        );
      });
      if (result.error !== undefined) break;
    }
  } finally {
    clearTimeout(timer);
    runner.kill();
    scope.dispose();
    for (const id in store.nodes) store.nodes[id]?.dispose?.();
    release();
  }
  return results;
}
