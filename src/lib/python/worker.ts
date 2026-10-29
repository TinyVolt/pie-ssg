import PIE_PY from './py/pie.py?raw';
import PIE_MPL_PY from './py/pie_mpl.py?raw';
import SHOW_FIGURES from './py/show_figures.py?raw';
import type { CallOptions } from '~/lib/nodes/execute';

const BASE = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/';

const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let next = 0;

/** Posts `message` to the page and waits for its reply. */
const request = (message: object) =>
  new Promise((resolve, reject) => {
    const reqId = next++;
    pending.set(reqId, { resolve, reject });
    postMessage({ ...message, reqId });
  });

const call = (keyword: string, args: unknown[], options: CallOptions) =>
  request({ type: 'call', keyword, args, options });

/** The node at `position` of an array's items. Creates nothing. */
const item = (arrayId: string, position: number) => request({ type: 'item', arrayId, position });

/** The node with id `id`. Creates nothing. */
const get_node = (id: string) => request({ type: 'get_node', id });

/** First half of `g(a)` for `g = pie.lift(f, ...)`: the input values and the output id. */
const lift = (name: string, inputIds: string[], kind: string, out?: string, fill?: string, stroke?: string) =>
  request({ type: 'lift', name, inputIds, kind, out, fill, stroke });

/** Second half of `g(a)`: the first result. Python doesn't wait for a reply. */
const lift_save = (save: object) => postMessage({ type: 'lift_save', ...save });

/** `pie.ui.<name>(...)`: shows a UI below the block. `args`: nodes as `{id}`, or lists of them. */
const ui = (name: string, args: unknown[], options: object) => request({ type: 'ui', name, args, options });

/** Results of a batch the page asked for in a reply, before an animation. Waits for the call's next reply. */
const batch_done = (results: unknown) => request({ type: 'batch_done', results });

const ready = (async () => {
  const { loadPyodide } = await import(/* @vite-ignore */ `${BASE}pyodide.mjs`);
  const py = await loadPyodide({ indexURL: BASE, env: { MPLBACKEND: 'module://pie_mpl' } });
  py.setStdout({ batched: (text: string) => postMessage({ type: 'output', text: text + '\n' }) });
  py.setStderr({ batched: (text: string) => postMessage({ type: 'output', text: text + '\n' }) });
  py.registerJsModule('bridge', {
    call, item, get_node, lift, lift_save, batch_done, ui, plot: (png: string) => postMessage({ type: 'plot', png }),
  });
  py.FS.writeFile('/home/pyodide/pie.py', PIE_PY);
  py.FS.writeFile('/home/pyodide/pie_mpl.py', PIE_MPL_PY);
  postMessage({ type: 'loaded' });
  return py;
})();

// Scope id -> the Python globals its runs share. One scope per page.
const scopes = new Map<string, any>();

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

self.onmessage = async ({ data }) => {
  if (data.type === 'reply') {
    const { resolve, reject } = pending.get(data.reqId)!;
    pending.delete(data.reqId);
    if (data.error !== undefined) reject(new Error(data.error));
    else resolve(data.result);
  }
  if (data.type === 'run') {
    let error: string | undefined;
    try {
      const py = await ready;
      let globals = scopes.get(data.scope);
      if (!globals) {
        globals = py.globals.get('dict')();
        py.runPython('import pie', { globals });
        scopes.set(data.scope, globals);
      }
      // A batch finds lifted functions in the running block's globals.
      const pie = py.pyimport('pie');
      pie._scope = globals;
      pie.destroy();
      // Downloads packages the code imports (numpy, scipy, matplotlib, ...) on first use.
      await py.loadPackagesFromImports(data.code);
      try {
        await py.runPythonAsync(data.code, { globals });   // Async entry is required for run_sync
      } catch (e) {
        error = message(e);
      }
      // Runs after an error too, so figures drawn before it still show.
      py.runPython(SHOW_FIGURES);
    } catch (e) {
      error ??= message(e);
    }
    postMessage({ type: 'done', error });
  }
  // The page sends reruns only between runs, so this never interleaves with a run.
  if (data.type === 'rerun') {
    let result: unknown;
    let error: string | undefined;
    try {
      const py = await ready;
      const globals = scopes.get(data.scope);
      if (!globals) throw new Error("Python was restarted, so this node can't rerun. Run the block that made it again.");
      const pie = py.pyimport('pie');
      const values = py.toPy(data.values);
      try {
        const out = pie._rerun(globals, data.nodeId, values);
        result = out.toJs({ dict_converter: Object.fromEntries });
        out.destroy();
      } finally {
        values.destroy();
        pie.destroy();
      }
    } catch (e) {
      error = message(e);
    }
    postMessage({ type: 'rerun_done', reqId: data.reqId, result, error });
  }
  if (data.type === 'dispose') {
    scopes.get(data.scope)?.destroy();
    scopes.delete(data.scope);
  }
};
