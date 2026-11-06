# pie inside another app: `@tinyvolt/pie/runtime`

[pie-ssg](https://github.com/TinyVolt/pie-ssg) builds sites from Markdown pages. Readers can run Python in a page and draw on a canvas. `@tinyvolt/pie/runtime` shows the same pages inside another app (the "host"), e.g. as a Markdown preview: the host turns pie markdown into a page with `compilePie` and shows it with `<PiePage>`.

The markdown format is the one a site uses. It is described in `node_modules/@tinyvolt/pie/init/site-agents.md`, the guide for sites. This guide covers only what differs in a host.

## Requirements

- A Solid app built with Vite and Solid's Vite plugin (`vite-plugin-solid`; SolidStart includes it). pie ships its components with their JSX, under the `solid` export condition, and the host's Solid plugin compiles them for the browser and the server.
- `solid-js` ^1.9.14 and `vite` ^8.1.4, as the host's own dependencies. pie uses the host's copy of Solid: two copies on one page break reactivity.
- No other setup: no aliases, `optimizeDeps` or `ssr.noExternal` settings for pie.

```sh
npm install @tinyvolt/pie
```

Installing changes none of the host's files.

## A preview

```tsx
import { createSignal, ErrorBoundary, Show } from 'solid-js';
import { compilePie, PiePage, type Page } from '@tinyvolt/pie/runtime';
import '@tinyvolt/pie/runtime.css';

export default function Preview() {
  const [text, setText] = createSignal('# Hello\n\n$x^2$');
  const [page, setPage] = createSignal<Page>();
  const [error, setError] = createSignal('');

  const preview = () => {
    try {
      setPage(compilePie(text()));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <textarea value={text()} onInput={e => setText(e.currentTarget.value)} />
      <button onClick={preview}>Preview</button>
      <p>{error()}</p>
      <div style={{ height: '80vh' }}>
        <Show when={page()}>
          {page => (
            <ErrorBoundary fallback={err => <p>{err.message}</p>}>
              <PiePage page={page()} />
            </ErrorBoundary>
          )}
        </Show>
      </div>
    </>
  );
}
```

## `compilePie(markdown, options?)`

Turns pie markdown into a `Page`, as a site build would: `{ frontmatter, html, features }`. Runs in the browser or on a server.

- It throws an `Error` with the message a site build gives, e.g. ``page.md: `canvas` must be one of left, right, top, bottom, none, got "middle"``.
- `options.file`: the page's name in those messages. Default `page.md`.
- `options.site`: what a site's `site.yml` gives: the value of `sidebar`, `toc` and `glossary` for a page that leaves the key out, e.g. `{ toc: true }`. An error about one of these values names `site.yml`.
- `options.readFile(path)`: returns the text of another `.md` file, for `sidebar: _topics.md` and `glossary: _terms.md`. `path` is exactly as the page or `site` wrote it. Its frontmatter is ignored. Without `readFile`, such a page throws `file _topics.md does not exist`.
- Tags show as plain text, not links: a host has no tag pages.

## `<PiePage page modules? css? />`

Shows a `Page` as a pie site shows it: the text, the canvas on the side `canvas:` names, and the toc, sidebar, glossary and tags. It shows only the page: not a site's header, and it doesn't set the browser tab's title.

- It renders a `<div class="pie-page">` that fills its parent. Give the parent a height. The text and the canvas scroll inside it.
- A new `page`, `modules` or `css` starts a fresh canvas and fresh Python variables, as opening another page in a site does.
- `modules`: the host's own functions, node types and UIs. See below.
- `css`: CSS like a site's `styles/*.css`, limited to the page. E.g. `h1 { color: crimson; }` styles only the page's headings. It is removed with the page, or when `css` changes.
- Only one `PiePage` can be mounted at a time, because custom code is global. Mounting a second throws `Only one PiePage can be mounted at a time`.
- It renders on the server too. Python, the canvas's drawing and the UIs need the browser, and `modules` is used only there.
- Python runs in a web worker with Pyodide, loaded from `https://cdn.jsdelivr.net/pyodide/`. A host with a Content-Security-Policy must allow `cdn.jsdelivr.net` in `script-src` and `connect-src`, and `'wasm-unsafe-eval'` in `script-src`.

## Your own functions, node types and UIs: `modules`

A site keeps these in its `functions/`, `nodes/` and `ui/` folders. A host keeps them in its own files and passes them in:

```tsx
import * as squareFns from './pie/square';
import * as squareNodes from './pie/squareNode';
import * as stepperUi from './pie/stepper';

<PiePage
  page={page()}
  modules={{
    functions: [{ file: 'pie/square.ts', exports: squareFns }],
    nodes: [{ file: 'pie/squareNode.tsx', exports: squareNodes }],
    ui: [{ file: 'pie/stepper.tsx', exports: stepperUi }],
  }}
/>
```

- `exports`: a module's exports, what `import * as m from '...'` gives. `file`: its name in error messages.
- Each kind takes the exports a site's folder takes: `Node2NodeFunc`s and `SideEffectFunc`s for `functions`, `NodeDefinition`s for `nodes`, and PascalCase components for `ui` (`MatrixProduct` is `pie.ui.matrix_product`). Other exports are ignored.
- The built-in functions, node types and UIs are always there. A name used twice, by two modules or by a module and a built-in, makes `PiePage` throw, e.g. `Duplicate function keyword 'square': pie/a.ts and pie/b.ts`. Wrap it in an `<ErrorBoundary>` to show the message.
- After the page goes, its modules' names are gone: `pie.square(...)` raises `Unknown function: square`.

Write them as `init/site-agents.md` describes, under "Your own functions", "Your own node types" and "Your own UIs", with one change: import from `@tinyvolt/pie/runtime` instead of `~/lib/...`. A site's file moves into a host by changing only those import lines.

```ts
import { add, div, ref, scalar, type AnyNode, type Node2NodeFunc, type PointNode } from '@tinyvolt/pie/runtime';
```

`@tinyvolt/pie/runtime` exports:

- Math on node values: everything in a site's `~/lib/nodes/jax` (`num`, `scalar`, `ref`, `add`, `sub`, `mul`, `div`, `sqrt`, `sin`, `cos`, `atan2`, …).
- Node types: `Node`, `AnyNode`, `NodeType`, `NodeTypeMap`, `NodeDefinition`, and each built-in node: `TextNode`, `PointNode`, `ScalarNode`, `TriangleNode`, `LineNode`, `CircleNode`, `EllipseNode`, `BezierQuadraticNode`, `BezierCubicNode`, `ArcNode`, `PointGradNode`, `ArrayNode`, `DummyNode`.
- Functions: `Node2NodeFunc`, `SideEffectFunc`, `ParameterDefinition`, `NodeStore` (what a `SideEffectFunc`'s `run` gets) and `Track` (what an animated one returns).
- UIs: `expectNode`, `useSetNode`, `UiArg`, `NodeHandle`.

A node type adds itself to `NodeTypeMap` on `@tinyvolt/pie/runtime`, not on `~/lib/nodes/state/Node`:

```ts
declare module '@tinyvolt/pie/runtime' {
  interface NodeTypeMap {
    Square: SquareNode;
  }
}
```

## Styles: `@tinyvolt/pie/runtime.css`

Import it once: `import '@tinyvolt/pie/runtime.css'`. It also needs KaTeX's CSS, which `PiePage` imports itself.

- Every rule is limited to `.pie-page`, so it styles nothing else in the host.
- The host's rules for bare elements, like `main` or a `* { margin: 0; padding: 0 }` reset, lose to pie's rules for the same properties. pie also sets the list padding and heading margins a reset removes.
- A property pie doesn't set, or a host rule with a class or id, can still reach into the page, e.g. `button { text-transform: uppercase }`.
- To restyle the page, set the variables of a site's `styles/theme.css` on `.pie-page`, e.g. `.pie-page { --color-text: #222; --content-width: 50rem; }`: colors (`--color-text`, `--color-bg`, `--color-muted`, `--color-subtle`, `--color-hover`, `--color-border`, `--color-border-hover`, `--color-code-bg`, `--color-error`, `--color-backdrop`), fonts (`--font-ui`, `--font-body`, `--font-mono`, `--font-size-body`, `--line-height`) and layout (`--content-width`, `--sidebar-width`, `--sidebar-drawer-below`).
- Or add rules that start with `.pie-page`, in CSS loaded after `runtime.css`, e.g. `.pie-page main h1 { color: crimson; }`, or pass them as `css`. The class names are under "Styles" in `init/site-agents.md`.

## What differs from a site

- There is no `pages/` folder and no URLs: the host passes the markdown to `compilePie`.
- `site.yml` is `compilePie`'s `site` option. Its `title`, `url` and `description` don't apply.
- `sidebar` and `glossary` files come from `readFile`.
- Tags are plain text, and there are no `/_tags` pages.
- Links in a page or its sidebar are ordinary links in the host, e.g. `[Home](/)` opens the host's `/`.
- A site's build checks are errors instead: bad frontmatter, a missing `sidebar` or `glossary` file and an unknown `[[term]]` from `compilePie`; a name used twice from `PiePage`.
- `layouts/`, `public/` and the site's header don't apply.
