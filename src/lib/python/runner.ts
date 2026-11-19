import type { NodeStore } from '~/lib/nodes/state/NodeStore';
import { execute } from '~/lib/nodes/execute';
import { getItem } from '~/lib/nodes/tensors/tensor';
import { prepareLifts, saveLift, startLift, type BatchJob, type BatchResult, type InputValue, type PyResult } from './lift';
import type { UiCall } from '~/lib/ui/UiView';

export type RunStatus = 'waiting' | 'loading' | 'running' | 'finished' | 'stopped' | 'killed';

interface Run {
  scope: PythonScope;
  code: string;
  onStatus: (status: RunStatus, error?: string) => void;
  onOutput: (text: string) => void;
  /** `png`: a matplotlib figure as a base64 PNG. */
  onPlot: (png: string) => void;
  /** A `pie.ui.*` call. Throws when the call is wrong; Python raises the error. */
  onUi: (call: UiCall) => void;
}

let nextScopeId = 0;

/** A request to rerun the `pie.lift`ed function of node `nodeId` with new input values. */
interface Rerun {
  scope: PythonScope;
  nodeId: string;
  values: InputValue[];
  done: (result?: PyResult, error?: string) => void;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** One Python worker and its queue of runs, which it runs one at a time. */
export class PythonRunner {
  private worker: Worker | undefined;
  private loaded = false;
  private active: Run | undefined;
  private readonly queue: Run[] = [];

  // Reruns waiting for the running block to end, by scope and node id. A newer request replaces a waiting one.
  private readonly waitingReruns = new Map<string, Rerun>();
  // Reruns sent to the worker, by request id.
  private readonly sentReruns = new Map<number, Rerun>();
  private nextRerunId = 0;

  // Set while a `pie.*` call waits for Python to run a batch: takes Python's results and the id of its request.
  private batchDone: ((reqId: number, results: BatchResult[][]) => void) | undefined;

  private onMessage(from: Worker, { data }: MessageEvent) {
    const run = this.active;
    if (data.type === 'loaded') {
      this.loaded = true;
      run?.onStatus('running');
    }
    if (data.type === 'call' || data.type === 'item' || data.type === 'get_node' || data.type === 'lift' || data.type === 'ui') {
      // The request to answer: this one, or, after a batch, Python's request with the batch's results.
      let reqId: number = data.reqId;
      // A reply from before a kill must not reach the new worker.
      const reply = (msg: { result?: unknown; error?: string }) => {
        if (this.worker === from) from.postMessage({ type: 'reply', reqId, ...msg });
      };
      const store = run?.scope.store;
      if (!store) {
        reply({ error: 'this page has no canvas' });
        return;
      }
      if (data.type === 'item') {
        try {
          reply({ result: getItem(store, data.arrayId, data.position) });
        } catch (err) {
          reply({ error: message(err) });
        }
        return;
      }
      if (data.type === 'get_node') {
        const node = store.getNodeValue(data.id);
        if (!node) reply({ error: `pie.get_node: no node with id '${data.id}'` });
        else if (node.type === 'Array') reply({ result: { id: node.id, type: node.type, shape: node.shape, itemType: node.itemType } });
        else reply({ result: { id: node.id, type: node.type } });
        return;
      }
      if (data.type === 'ui') {
        try {
          run!.onUi({ name: data.name, args: data.args, options: data.options });
          reply({ result: null });
        } catch (err) {
          reply({ error: message(err) });
        }
        return;
      }
      if (data.type === 'lift') {
        try {
          reply({ result: startLift(store, data.name, data.inputIds, data.kind, data.out, data.fill, data.stroke) });
        } catch (err) {
          reply({ error: message(err) });
        }
        return;
      }
      // Python runs a batch inside this call: the reply asks for it, and Python sends the results back as a new request.
      const runBatch = (jobs: BatchJob[]) => new Promise<BatchResult[][]>((resolve) => {
        this.batchDone = (next, results) => {
          reqId = next;
          resolve(results);
        };
        reply({ result: { batch: jobs } });
      });
      execute(store, data.keyword, data.args, data.options, (visitSteps) => prepareLifts(visitSteps, runBatch)).then(
        (result) => reply({ result }),
        (err) => reply({ error: message(err) }),
      );
    }
    if (data.type === 'batch_done') {
      const done = this.batchDone;
      this.batchDone = undefined;
      done?.(data.reqId, data.results);
    }
    // No reply: Python doesn't wait for it.
    if (data.type === 'lift_save') {
      const scope = run?.scope;
      try {
        if (scope?.store) saveLift(scope.store, data, (nodeId, values, done) => scope.rerun(nodeId, values, done));
      } catch (err) {
        console.error(`${data.name}: ${message(err)}`);
      }
    }
    if (data.type === 'rerun_done') {
      const rerun = this.sentReruns.get(data.reqId);
      this.sentReruns.delete(data.reqId);
      rerun?.done(data.result, data.error);
    }
    if (data.type === 'output') {
      run?.onOutput(data.text);
    }
    if (data.type === 'plot') {
      run?.onPlot(data.png);
    }
    if (data.type === 'done') {
      this.finish(data.error);
    }
  }

  private startNext() {
    if (this.active || this.queue.length === 0) return;
    this.active = this.queue.shift()!;
    if (!this.worker) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => this.onMessage(worker, e);
      worker.onerror = (e) => this.finish(e.message || 'Python worker failed to start');
      this.worker = worker;
    }
    this.active.onStatus(this.loaded ? 'running' : 'loading');
    this.worker.postMessage({ type: 'run', scope: this.active.scope.id, code: this.active.code });
  }

  private finish(error?: string) {
    const run = this.active;
    if (!run) return;
    this.active = undefined;
    // Pyodide failed to load: start a fresh worker next time instead of reusing the broken one.
    if (!this.loaded) this.killWorker();
    if (run.scope.disposed) this.worker?.postMessage({ type: 'dispose', scope: run.scope.id });
    run.onStatus('finished', error);
    this.sendReruns();
    this.startNext();
  }

  /**
   * Sends the waiting reruns, unless a block is running. After a kill they wait for the next worker,
   * which answers that Python was restarted.
   */
  private sendReruns() {
    if (this.active || !this.worker) return;
    for (const rerun of this.waitingReruns.values()) {
      const reqId = this.nextRerunId++;
      this.sentReruns.set(reqId, rerun);
      this.worker.postMessage({ type: 'rerun', reqId, scope: rerun.scope.id, nodeId: rerun.nodeId, values: rerun.values });
    }
    this.waitingReruns.clear();
  }

  private killWorker() {
    this.worker?.terminate();
    this.worker = undefined;
    this.loaded = false;
    // Their replies will never come.
    this.sentReruns.clear();
    this.batchDone = undefined;
  }

  /** Kills Python. The running run and every queued run end as killed. */
  kill() {
    this.killWorker();
    const ended = [...(this.active ? [this.active] : []), ...this.queue];
    this.active = undefined;
    this.queue.length = 0;
    for (const run of ended) run.onStatus('killed');
  }

  /** Queues `run`. Returns its stop function. */
  enqueue(run: Run): () => void {
    this.queue.push(run);
    run.onStatus('waiting');
    this.startNext();

    // The stop function (the editor's ■ button): drops the run if queued, kills Python if it's running.
    return () => {
      const at = this.queue.indexOf(run);
      if (at !== -1) {
        this.queue.splice(at, 1);
        run.onStatus('stopped');
      } else if (this.active === run) {
        this.kill();
      }
    };
  }

  /** Queues `rerun`. It waits while a block runs. */
  rerun(rerun: Rerun) {
    this.waitingReruns.set(`${rerun.scope.id}/${rerun.nodeId}`, rerun);
    this.sendReruns();
  }

  /** Drops `scope`'s queued runs and reruns, and frees its variables. */
  dispose(scope: PythonScope) {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].scope === scope) this.queue.splice(i, 1);
    }
    for (const [key, rerun] of this.waitingReruns) {
      if (rerun.scope === scope) this.waitingReruns.delete(key);
    }
    // A running run still uses the variables; `finish` frees them.
    if (this.active?.scope !== scope) this.worker?.postMessage({ type: 'dispose', scope: scope.id });
  }
}

/** The worker every page's editors share. */
const pageRunner = new PythonRunner();

/** Runs that share Python variables, and the store their `pie.*` calls draw on. */
export class PythonScope {
  readonly id = String(nextScopeId++);
  disposed = false;

  /**
   * `store`: where `pie.*` calls draw. Without it they fail with "this page has no canvas".
   * `runner`: the worker to run in. Default: the one every page shares.
   */
  constructor(readonly store?: NodeStore, private readonly runner: PythonRunner = pageRunner) {}

  /** Queues `code`. Returns a stop function. `error` comes only with `finished`. */
  run(code: string, onStatus: Run['onStatus'], onOutput: Run['onOutput'], onPlot: Run['onPlot'], onUi: Run['onUi']): () => void {
    return this.runner.enqueue({ scope: this, code, onStatus, onOutput, onPlot, onUi });
  }

  /** Queues a rerun of node `nodeId`'s `pie.lift`ed function. It waits while a block runs. */
  rerun(nodeId: string, values: InputValue[], done: Rerun['done']) {
    if (this.disposed) return;
    this.runner.rerun({ scope: this, nodeId, values, done });
  }

  /** Frees the variables. Call when the page goes away. */
  dispose() {
    this.disposed = true;
    this.runner.dispose(this);
  }
}
