import { createSignal, onCleanup } from 'solid-js';
import { NodeStore } from '~/lib/nodes/state/NodeStore';
import { execute } from '~/lib/nodes/execute';

/** Owns the Python worker and the store its calls write to. */
export function createRunner() {
  const store = new NodeStore();
  const [output, setOutput] = createSignal('');
  const [running, setRunning] = createSignal(false);

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  onCleanup(() => worker.terminate());

  worker.onmessage = ({ data }) => {
    if (data.type === 'call') {
      execute(store, data.keyword, data.args, data.out).then(
        (result) => worker.postMessage({ type: 'reply', reqId: data.reqId, result }),
        (err) => worker.postMessage({ type: 'reply', reqId: data.reqId, error: err instanceof Error ? err.message : String(err) })
      );
    }
    if (data.type === 'output') {
      setOutput(prev => prev + data.text);
    }
    if (data.type === 'done') {
      if (data.error) setOutput(prev => prev + data.error);
      setRunning(false);
    }
  };

  const run = (code: string) => {
    // store.clearNodes();
    setOutput('');
    setRunning(true);
    worker.postMessage({ type: 'run', code });
  };

  return { store, output, running, run };
}
