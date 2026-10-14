import type { NodeStore } from '~/lib/nodes/state/NodeStore';
import { execute } from '~/lib/nodes/execute';

/**
 * The one Python worker for the whole site. It starts on the first run and lives
 * across page changes, so Pyodide loads once. Runs go one at a time, in order.
 */

export type RunStatus = 'waiting' | 'loading' | 'running';
/** `restarted`: Python was killed, so every scope's variables are gone. */
export type RunEnd = { kind: 'finished'; error?: string } | { kind: 'stopped'; restarted: boolean };

export interface RunHandlers {
  onStatus: (status: RunStatus) => void;
  onOutput: (text: string) => void;
  onEnd: (end: RunEnd) => void;
}

/** Runs that share Python variables, and the store their `pie.*` calls draw on. */
export interface PythonScope {
  /** Queues `code`. Returns a stop function. */
  run: (code: string, handlers: RunHandlers) => () => void;
  /** Frees the variables. Call when the page goes away. */
  dispose: () => void;
}

interface Scope {
  id: string;
  store?: NodeStore;
  disposed: boolean;
}

interface Run {
  scope: Scope;
  code: string;
  handlers: RunHandlers;
}

let worker: Worker | undefined;
let loaded = false;
let active: Run | undefined;
const queue: Run[] = [];
let nextScopeId = 0;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

function onMessage(this: Worker, { data }: MessageEvent) {
  const run = active;
  if (data.type === 'loaded') {
    loaded = true;
    run?.handlers.onStatus('running');
  }
  if (data.type === 'call') {
    // A reply from before a restart must not reach the new worker.
    const reply = (msg: { result?: unknown; error?: string }) => {
      if (worker === this) this.postMessage({ type: 'reply', reqId: data.reqId, ...msg });
    };
    const store = run?.scope.store;
    if (!store) {
      reply({ error: 'this page has no canvas' });
      return;
    }
    execute(store, data.keyword, data.args, data.out).then(
      (result) => reply({ result }),
      (err) => reply({ error: message(err) }),
    );
  }
  if (data.type === 'output') {
    run?.handlers.onOutput(data.text);
  }
  if (data.type === 'done') {
    finish({ kind: 'finished', error: data.error });
  }
}

function startNext() {
  if (active || queue.length === 0) return;
  active = queue.shift()!;
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = onMessage;
    worker.onerror = (e) => finish({ kind: 'finished', error: e.message || 'Python worker failed to start' });
  }
  active.handlers.onStatus(loaded ? 'running' : 'loading');
  worker.postMessage({ type: 'run', scope: active.scope.id, code: active.code });
}

function finish(end: RunEnd) {
  const run = active;
  if (!run) return;
  active = undefined;
  // Pyodide failed to load: start a fresh worker next time instead of reusing the broken one.
  if (!loaded) killWorker();
  if (run.scope.disposed) worker?.postMessage({ type: 'dispose', scope: run.scope.id });
  run.handlers.onEnd(end);
  startNext();
}

function killWorker() {
  worker?.terminate();
  worker = undefined;
  loaded = false;
}

/** Kills Python. The running run and every queued run end as stopped. */
function restartPython() {
  killWorker();
  const ended = [...(active ? [active] : []), ...queue];
  active = undefined;
  queue.length = 0;
  for (const run of ended) run.handlers.onEnd({ kind: 'stopped', restarted: true });
}

/** `store`: where `pie.*` calls draw. Without it they fail with "this page has no canvas". */
export function createPythonScope(store?: NodeStore): PythonScope {
  const scope: Scope = { id: String(nextScopeId++), store, disposed: false };

  return {
    run(code, handlers) {
      const run: Run = { scope, code, handlers };
      queue.push(run);
      handlers.onStatus('waiting');
      startNext();
      return () => {
        const at = queue.indexOf(run);
        if (at !== -1) {
          queue.splice(at, 1);
          handlers.onEnd({ kind: 'stopped', restarted: false });
        } else if (active === run) {
          restartPython();
        }
      };
    },

    dispose() {
      scope.disposed = true;
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].scope === scope) queue.splice(i, 1);
      }
      // A running run still uses the variables; `finish` frees them.
      if (active?.scope !== scope) worker?.postMessage({ type: 'dispose', scope: scope.id });
    },
  };
}
