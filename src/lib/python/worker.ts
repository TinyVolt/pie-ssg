const BASE = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/';
const PIE_PY = `
from pyodide.ffi import run_sync, to_js
from js import Object
import bridge

class Node:
    def __init__(self, id, type):
        self.id = id
        self.type = type

    def __repr__(self):
        return f"{self.type}({self.id})"

def _arg(a):
    return {"id": a.id} if isinstance(a, Node) else a

def __getattr__(name):
    if name.startswith("_"):
        raise AttributeError(name)
    def fn(*args, out=None):
        js_args = to_js([_arg(a) for a in args], dict_converter=Object.fromEntries)
        result = run_sync(bridge.call(name, js_args, out))
        return Node(result.id, result.type)
    return fn
`;

// Matplotlib backend: `plt.show()` sends each open figure to the editor as a PNG, then closes it.
const PIE_MPL_PY = `
import base64, io, sys
import bridge
from matplotlib._pylab_helpers import Gcf
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

def show(*args, **kwargs):
    # Text printed before the plot must reach the editor first.
    sys.stdout.flush()
    sys.stderr.flush()
    for manager in Gcf.get_all_fig_managers():
        buf = io.BytesIO()
        manager.canvas.figure.savefig(buf, format="png")
        bridge.plot(base64.b64encode(buf.getvalue()).decode())
    Gcf.destroy_all()
`;

// Shows the figures a run left open, then closes them so they don't carry over to the next run.
const SHOW_FIGURES = `
import sys
if "matplotlib.pyplot" in sys.modules:
    sys.modules["matplotlib.pyplot"].show()
    sys.modules["matplotlib.pyplot"].close("all")
`;

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
