import { Accessor, Component, createSignal, For, onCleanup, onMount, Setter, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { basicSetup, EditorView } from 'codemirror';
import { keymap } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import { CheckIcon, Chevron, CopyIcon, CrossIcon, PlayIcon, ResetIcon, StopIcon } from '~/components/icons';
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

/** How the last run ended, shown in the toolbar. */
type RunResult = 'success' | 'error' | 'stopped';

const RESULT: Record<RunResult, { icon: Component; text: string }> = {
  success: { icon: CheckIcon, text: 'Ran successfully' },
  error: { icon: CrossIcon, text: 'Error' },
  stopped: { icon: StopIcon, text: 'Stopped' },
};

const isActive = (status: RunStatus | 'idle') =>
  status === 'waiting' || status === 'loading' || status === 'running';

/** One piece of a run's output. Text printed in a row is one entry. */
type OutputEntry =
  | { type: 'text'; text: Accessor<string>; setText: Setter<string> }
  | { type: 'plot'; png: string };

/**
 * An editable block of Python. Run draws its `pie.*` calls on the scope's canvas.
 * `collapsed`: start with only the toolbar showing.
 */
export function PythonEditor(props: { code: string; collapsed?: boolean; scope: PythonScope }) {
  let host!: HTMLDivElement;
  let view: EditorView | undefined;
  let stop: (() => void) | undefined;

  const [status, setStatus] = createSignal<RunStatus | 'idle'>('idle');
  const [output, setOutput] = createSignal<OutputEntry[]>([]);
  const [error, setError] = createSignal('');
  const [note, setNote] = createSignal('');
  const [collapsed, setCollapsed] = createSignal(props.collapsed ?? false);
  const [copied, setCopied] = createSignal(false);
  const active = () => isActive(status());
  const result = (): RunResult | undefined => {
    if (status() === 'finished') return error() ? 'error' : 'success';
    if (status() === 'stopped' || status() === 'killed') return 'stopped';
  };
  const initialCode = props.code.replace(/\n$/, '');

  const addText = (text: string) => {
    const last = output().at(-1);
    if (last?.type === 'text') {
      last.setText((prev) => prev + text);
      return;
    }
    const [value, setValue] = createSignal(text);
    setOutput((prev) => [...prev, { type: 'text', text: value, setText: setValue }]);
  };

  const run = () => {
    if (active() || !view) return;
    setOutput([]);
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
      addText,
      (png) => setOutput((prev) => [...prev, { type: 'plot', png }]),
    );
  };

  /** Printed text and the error, without plots or the stop note. */
  const copyText = () =>
    [
      ...output().flatMap((entry) => (entry.type === 'text' ? [entry.text()] : [])),
      error(),
    ]
      .map((part) => part.replace(/\n+$/, ''))
      .filter(Boolean)
      .join('\n');

  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText());
    } catch {
      return; // Clipboard is only available on https or localhost.
    }
    setCopied(true);
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => setCopied(false), 1500);
  };

  /** Puts the original code back. Ctrl/Cmd+Z undoes it. */
  const reset = () => {
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: initialCode } });
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
    // CodeMirror can't measure while hidden, so measure again once it's shown.
    if (!collapsed()) view?.requestMeasure();
  };

  /** Drag the bar under the code to set the editor's height. */
  const startResize = (e: PointerEvent) => {
    if (!view || e.button !== 0) return;
    e.preventDefault(); // no text selection while dragging
    const handle = e.currentTarget as HTMLElement;
    const editor = view.dom;
    const startY = e.clientY;
    const startHeight = editor.getBoundingClientRect().height;
    // About one line, plus the 4px top and bottom padding CodeMirror puts on its content.
    const minHeight = view.defaultLineHeight + 8;

    const move = (ev: PointerEvent) => {
      editor.style.maxHeight = 'none';
      editor.style.height = `${Math.max(minHeight, startHeight + ev.clientY - startY)}px`;
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.setPointerCapture(e.pointerId);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  const runFromKeyboard = () => {
    run();
    return true;
  };

  onMount(() => {
    view = new EditorView({
      doc: initialCode,
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
    clearTimeout(copiedTimer);
    view?.destroy();
  });

  return (
    <div class="python-editor" classList={{ 'python-editor-collapsed': collapsed() }}>
      <div class="python-editor-code" ref={host} />
      <div class="python-editor-resize" title="Drag to resize" onPointerDown={startResize} />
      <div class="python-editor-toolbar">
        <button
          type="button"
          class="python-editor-button"
          title={active() ? 'Stop' : 'Run (Shift+Enter)'}
          aria-label={active() ? 'Stop' : 'Run'}
          onClick={() => (active() ? stop?.() : run())}
        >
          {active() ? <StopIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          class="python-editor-button python-editor-reset"
          title="Reset code"
          aria-label="Reset code"
          onClick={reset}
        >
          <ResetIcon />
        </button>
        <span class="python-editor-status">{STATUS_TEXT[status()]}</span>
        <Show when={result()}>
          {(r) => (
            <span class={`python-editor-result python-editor-result-${r()}`}>
              <Dynamic component={RESULT[r()].icon} />
              {RESULT[r()].text}
            </span>
          )}
        </Show>
        <button
          type="button"
          class="python-editor-button python-editor-collapse"
          title={collapsed() ? 'Expand' : 'Collapse'}
          aria-label={collapsed() ? 'Expand' : 'Collapse'}
          aria-expanded={!collapsed()}
          onClick={toggleCollapsed}
        >
          <Chevron direction={collapsed() ? 'down' : 'up'} />
        </button>
      </div>
      <Show when={output().length > 0 || error() || note()}>
        <div class="python-editor-output">
          <Show when={copyText()}>
            <button
              type="button"
              class="python-editor-button python-editor-copy"
              title={copied() ? 'Copied' : 'Copy output'}
              aria-label={copied() ? 'Copied' : 'Copy output'}
              onClick={copy}
            >
              {copied() ? <CheckIcon /> : <CopyIcon />}
            </button>
          </Show>
          <For each={output()}>
            {(entry) =>
              entry.type === 'text' ? (
                <pre class="python-editor-text">{entry.text()}</pre>
              ) : (
                <img class="python-editor-plot" src={`data:image/png;base64,${entry.png}`} alt="Plot" />
              )
            }
          </For>
          <Show when={error() || note()}>
            <pre class="python-editor-text">
              <span class="python-editor-error">{error()}</span>
              <span class="python-editor-note">{note()}</span>
            </pre>
          </Show>
        </div>
      </Show>
    </div>
  );
}
