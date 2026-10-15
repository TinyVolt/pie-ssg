import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { basicSetup, EditorView } from 'codemirror';
import { keymap } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import type { PythonScope, RunStatus } from '~/lib/python/runner';

const STATUS_TEXT: Record<RunStatus | 'idle', string> = {
  idle: '',
  waiting: 'Waiting for another block…',
  loading: 'Loading Python…',
  running: 'Running…',
  finished: '',
  stopped: '',
  killed: '',
};

const END_NOTE: Partial<Record<RunStatus, string>> = {
  stopped: 'Stopped.',
  killed: 'Stopped. Python restarted, so variables from earlier blocks are gone.',
};

const isActive = (status: RunStatus | 'idle') =>
  status === 'waiting' || status === 'loading' || status === 'running';

/** An editable block of Python. Run draws its `pie.*` calls on the scope's canvas. */
export function PythonEditor(props: { code: string; scope: PythonScope }) {
  let host!: HTMLDivElement;
  let view: EditorView | undefined;
  let stop: (() => void) | undefined;

  const [status, setStatus] = createSignal<RunStatus | 'idle'>('idle');
  const [output, setOutput] = createSignal('');
  const [error, setError] = createSignal('');
  const [note, setNote] = createSignal('');
  const active = () => isActive(status());

  const run = () => {
    if (active() || !view) return;
    setOutput('');
    setError('');
    setNote('');
    stop = props.scope.run(
      view.state.doc.toString(),
      (next, err) => {
        setStatus(next);
        if (isActive(next)) return;
        stop = undefined;
        if (err) setError(err);
        setNote(END_NOTE[next] ?? '');
      },
      (text) => setOutput((prev) => prev + text),
    );
  };

  const runFromKeyboard = () => {
    run();
    return true;
  };

  onMount(() => {
    view = new EditorView({
      doc: props.code.replace(/\n$/, ''),
      extensions: [
        // Before basicSetup, so these win over its Enter bindings.
        keymap.of([
          { key: 'Shift-Enter', run: runFromKeyboard },
          { key: 'Mod-Enter', run: runFromKeyboard },
        ]),
        basicSetup,
        python(),
      ],
      parent: host,
    });
  });

  onCleanup(() => {
    stop?.();
    view?.destroy();
  });

  return (
    <div class="python-editor">
      <div class="python-editor-code" ref={host} />
      <div class="python-editor-toolbar">
        <button
          type="button"
          class="python-editor-button"
          title={active() ? 'Stop' : 'Run (Shift+Enter)'}
          aria-label={active() ? 'Stop' : 'Run'}
          onClick={() => (active() ? stop?.() : run())}
        >
          {active() ? '■' : '▶'}
        </button>
        <span class="python-editor-status">{STATUS_TEXT[status()]}</span>
      </div>
      <Show when={output() || error() || note()}>
        <pre class="python-editor-output">
          {output()}
          <span class="python-editor-error">{error()}</span>
          <span class="python-editor-note">{note()}</span>
        </pre>
      </Show>
    </div>
  );
}
