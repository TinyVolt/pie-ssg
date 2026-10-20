import type { NodeStore } from '~/lib/nodes/state/NodeStore';
import { execute } from '~/lib/nodes/execute';
import { getItem } from '~/lib/nodes/tensors/tensor';
import { saveLift, startLift, type InputValue, type PyResult } from './lift';

export type RunStatus = 'waiting' | 'loading' | 'running' | 'finished' | 'stopped' | 'killed';

interface Run {
  scope: PythonScope;
  code: string;
  onStatus: (status: RunStatus, error?: string) => void;
  onOutput: (text: string) => void;
  /** `png`: a matplotlib figure as a base64 PNG. */
  onPlot: (png: string) => void;
}

let worker: Worker | undefined;
let loaded = false;
let active: Run | undefined;
const queue: Run[] = [];
let nextScopeId = 0;

/** A request to rerun the `pie.lift`ed function of node `nodeId` with new input values. */
interface Rerun {
  scope: PythonScope;
  nodeId: string;
  values: InputValue[];
  done: (result?: PyResult, error?: string) => void;
}

// Reruns waiting for the running block to end, by scope and node id. A newer request replaces a waiting one.
const waitingReruns = new Map<string, Rerun>();
// Reruns sent to the worker, by request id.
const sentReruns = new Map<number, Rerun>();
let nextRerunId = 0;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

function onMessage(this: Worker, { data }: MessageEvent) {
  const run = active;
  if (data.type === 'loaded') {
    loaded = true;
    run?.onStatus('running');
  }
  if (data.type === 'call' || data.type === 'item' || data.type === 'lift') {
    // A reply from before a kill must not reach the new worker.
    const reply = (msg: { result?: unknown; error?: string }) => {
      if (worker === this) this.postMessage({ type: 'reply', reqId: data.reqId, ...msg });
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
    if (data.type === 'lift') {
      try {
        reply({ result: startLift(store, data.name, data.inputIds, data.kind, data.out) });
      } catch (err) {
        reply({ error: message(err) });
      }
      return;
    }
    execute(store, data.keyword, data.args, data.out).then(
      (result) => reply({ result }),
      (err) => reply({ error: message(err) }),
    );
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
    const rerun = sentReruns.get(data.reqId);
    sentReruns.delete(data.reqId);
    rerun?.done(data.result, data.error);
  }
  if (data.type === 'output') {
    run?.onOutput(data.text);
  }
  if (data.type === 'plot') {
    run?.onPlot(data.png);
  }
  if (data.type === 'done') {
    finish(data.error);
  }
}

function startNext() {
  if (active || queue.length === 0) return;
  active = queue.shift()!;
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = onMessage;
    worker.onerror = (e) => finish(e.message || 'Python worker failed to start');
  }
  active.onStatus(loaded ? 'running' : 'loading');
  worker.postMessage({ type: 'run', scope: active.scope.id, code: active.code });
}

function finish(error?: string) {
  const run = active;
  if (!run) return;
  active = undefined;
  // Pyodide failed to load: start a fresh worker next time instead of reusing the broken one.
  if (!loaded) killWorker();
  if (run.scope.disposed) worker?.postMessage({ type: 'dispose', scope: run.scope.id });
  run.onStatus('finished', error);
  sendReruns();
  startNext();
}

/**
 * Sends the waiting reruns, unless a block is running. After a kill they wait for the next worker,
 * which answers that Python was restarted.
 */
function sendReruns() {
  if (active || !worker) return;
  for (const rerun of waitingReruns.values()) {
    const reqId = nextRerunId++;
    sentReruns.set(reqId, rerun);
    worker.postMessage({ type: 'rerun', reqId, scope: rerun.scope.id, nodeId: rerun.nodeId, values: rerun.values });
  }
  waitingReruns.clear();
}

function killWorker() {
  worker?.terminate();
  worker = undefined;
  loaded = false;
  // Their replies will never come.
  sentReruns.clear();
}

/** Kills Python. The running run and every queued run end as killed. */
function killPython() {
  killWorker();
  const ended = [...(active ? [active] : []), ...queue];
  active = undefined;
  queue.length = 0;
  for (const run of ended) run.onStatus('killed');
}

/** Runs that share Python variables, and the store their `pie.*` calls draw on. */
export class PythonScope {
  readonly id = String(nextScopeId++);
  disposed = false;

  /** `store`: where `pie.*` calls draw. Without it they fail with "this page has no canvas". */
  constructor(readonly store?: NodeStore) {}

  /** Queues `code`. Returns a stop function. `error` comes only with `finished`. */
  run(code: string, onStatus: Run['onStatus'], onOutput: Run['onOutput'], onPlot: Run['onPlot']): () => void {
    const run: Run = { scope: this, code, onStatus, onOutput, onPlot };
    queue.push(run);
    onStatus('waiting');
    startNext();
    
    // The stop function (the editor's ■ button): drops the run if queued, kills Python if it's running.
    return () => {
      const at = queue.indexOf(run);
      if (at !== -1) {
        queue.splice(at, 1);
        onStatus('stopped');
      } else if (active === run) {
        killPython();
      }
    };
  }

  /** Queues a rerun of node `nodeId`'s `pie.lift`ed function. It waits while a block runs. */
  rerun(nodeId: string, values: InputValue[], done: Rerun['done']) {
    if (this.disposed) return;
    waitingReruns.set(`${this.id}/${nodeId}`, { scope: this, nodeId, values, done });
    sendReruns();
  }

  /** Frees the variables. Call when the page goes away. */
  dispose() {
    this.disposed = true;
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].scope === this) queue.splice(i, 1);
    }
    for (const [key, rerun] of waitingReruns) {
      if (rerun.scope === this) waitingReruns.delete(key);
    }
    // A running run still uses the variables; `finish` frees them.
    if (active?.scope !== this) worker?.postMessage({ type: 'dispose', scope: this.id });
  }
}
