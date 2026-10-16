import PIE_PY from './py/pie.py?raw';
import PIE_MPL_PY from './py/pie_mpl.py?raw';
import SHOW_FIGURES from './py/show_figures.py?raw';

const BASE = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/';

const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let next = 0;

const call = (keyword: string, args: unknown[], out?: string) =>
  new Promise((resolve, reject) => {
    const reqId = next++;
    pending.set(reqId, { resolve, reject });
    postMessage({ type: 'call', reqId, keyword, args, out });
  });

const ready = (async () => {
  const { loadPyodide } = await import(/* @vite-ignore */ `${BASE}pyodide.mjs`);
  const py = await loadPyodide({ indexURL: BASE, env: { MPLBACKEND: 'module://pie_mpl' } });
  py.setStdout({ batched: (text: string) => postMessage({ type: 'output', text: text + '\n' }) });
  py.setStderr({ batched: (text: string) => postMessage({ type: 'output', text: text + '\n' }) });
  py.registerJsModule('bridge', { call, plot: (png: string) => postMessage({ type: 'plot', png }) });
  py.FS.writeFile('/home/pyodide/pie.py', PIE_PY);
  py.FS.writeFile('/home/pyodide/pie_mpl.py', PIE_MPL_PY);
  postMessage({ type: 'loaded' });
  return py;
})();

// Scope id -> the Python globals its runs share. One scope per page.
const scopes = new Map<string, any>();

self.onmessage = async ({ data }) => {
  if (data.type === 'reply') {
    const { resolve, reject } = pending.get(data.reqId)!;
    pending.delete(data.reqId);
    if (data.error !== undefined) reject(new Error(data.error));
    else resolve(data.result);
  }
  if (data.type === 'run') {
    const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
    let error: string | undefined;
    try {
      const py = await ready;
      let globals = scopes.get(data.scope);
      if (!globals) {
        globals = py.globals.get('dict')();
        py.runPython('import pie', { globals });
        scopes.set(data.scope, globals);
      }
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
  if (data.type === 'dispose') {
    scopes.get(data.scope)?.destroy();
    scopes.delete(data.scope);
  }
};
