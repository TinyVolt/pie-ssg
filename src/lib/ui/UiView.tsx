import { ErrorBoundary, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { NodeStore } from '~/lib/nodes/state/NodeStore';
import { getUi } from './registry';
import { nodeHandle, StoreContext, type UiArg } from './nodeHandle';

/** A node as Python sends it, or a list of them at any depth. */
type SentArg = { id: string } | SentArg[];

/** A `pie.ui.<name>(*args, **options)` call. */
export interface UiCall {
  name: string;
  args: SentArg[];
  options: Record<string, unknown>;
}

const nodeIds = (args: SentArg[]): string[] => args.flatMap((a) => (Array.isArray(a) ? nodeIds(a) : [a.id]));

const toHandles = (store: NodeStore, args: SentArg[]): UiArg[] =>
  args.map((a) => (Array.isArray(a) ? toHandles(store, a) : nodeHandle(store, a.id)));

const present = (store: NodeStore, id: string) => {
  const node = store.getNodeValue(id);
  return node !== undefined && node.type !== 'Dummy';
};

/** Throws, for Python to raise, when there is no such UI or a node is missing. */
export function checkUi(store: NodeStore, call: UiCall) {
  if (!getUi(call.name)) throw new Error(`pie.ui: no UI named '${call.name}'`);
  const missing = nodeIds(call.args).find((id) => !present(store, id));
  if (missing !== undefined) throw new Error(`pie.ui.${call.name}: no node with id '${missing}'`);
}

/** Shows a UI. Shows nothing while one of its nodes is removed, and the error, after the UI's name, if it throws. */
export function UiView(props: { store: NodeStore; call: UiCall }) {
  const { name, args, options } = props.call;
  const ids = nodeIds(args);
  const handles = toHandles(props.store, args);

  return (
    <div class="python-editor-ui">
      <StoreContext.Provider value={props.store}>
        <ErrorBoundary fallback={(err) => <span class="python-editor-error">pie.ui.{name}: {err instanceof Error ? err.message : String(err)}</span>}>
          <Show when={ids.every((id) => present(props.store, id))}>
            <Dynamic component={getUi(name)!} {...options} args={handles} />
          </Show>
        </ErrorBoundary>
      </StoreContext.Provider>
    </div>
  );
}
