# pie-ssg site

This folder is a site made with [pie-ssg](https://github.com/TinyVolt/pie-ssg): a Markdown-based static site generator for interactive science explainers. Pages are Markdown. Readers can run Python in the page and draw on a canvas.

Requires Node 24.

```sh
npm run dev       # dev server
npm run build     # build to .output/; also runs the checks listed under "Build checks"
npm run start     # run the built server
npm run preview   # preview the build with vite
```

## Where things go

| Folder / file | What it holds |
| --- | --- |
| `pages/` | Markdown pages. `pages/a/b.md` is served at `/a/b`. |
| `functions/` | Your own TypeScript functions, called from Python as `pie.<keyword>(...)`. |
| `nodes/` | Your own node types: what a node holds and how it is drawn. |
| `layouts/` | Optional overrides: `header.tsx` (top of every page) and `index.tsx` (homepage, `/`). |
| `styles/` | CSS. Every `.css` file here loads after the built-in styles, so it wins. |
| `public/` | Static files, served as-is. |
| `site.yml` | Site settings. |
| `src/` | The pie-ssg app itself. |

Do the work in the folders above. Edit `src/` only when the task can't be done from them.

## site.yml

Flat `key: value` lines. Values may be quoted. A key may appear only once.

- `title` (required): shown in the header and in every browser tab title.

## Pages

A page is a `.md` file under `pages/`. `/pages` lists every page.

Optional frontmatter at the very top, as flat `key: value` lines:

```md
---
title: Circles
canvas: left
---
```

- `title`: the tab title. Empty means the tab shows the site title alone.
- `canvas`: `left`, `right`, `top`, `bottom` or `none` (default). Adds a canvas on that side of the page.

Other keys are ignored. A bad value fails the build, and shows an error screen in dev.

Math uses KaTeX: `$…$` inline, and `$$…$$` on its own lines for a display block.

A page's URL must not match a route in `src/routes/` (`/`, `/about`, `/pages`). For example, `pages/about.md` fails the build.

## Python editors

A `python-editor` code fence becomes a runnable editor with Run and Stop buttons. A plain `python` fence is only highlighted code.

````md
```python-editor
a = pie.point(1, 2, out='a')
r = pie.scalar(1, out='r')
pie.circle(a, r)
```
````

- Python runs in the browser with Pyodide 0.28.2. `pie` is already imported.
- All editors on one page share the same Python variables and the same canvas.
- `import numpy`, `scipy`, `matplotlib` and other [Pyodide packages](https://pyodide.org/en/0.28.2/usage/packages-in-pyodide.html) load on first use.
- `plt.show()` shows matplotlib figures under the editor.

## Drawing on the canvas: `pie.*`

Each `pie.<keyword>(...)` call makes a node: one thing the page tracks, such as a point or a circle. Nodes are drawn on the canvas. When a node changes, every node built from it updates.

`out='<id>'` names a node. Calling again with the same `out` replaces that node, and everything built from it updates:

```python
pie.scalar(3, out='r')   # the circle above now has radius 3
```

Common mistake: `center = pie.point(1, 2)` does not give the node the id `center`. It gets an automatic id. Use `pie.point(1, 2, out='center')`.

`unit` is a system node: a scalar holding the pixels per grid unit (default 50). Changing it changes the grid unit, e.g. `pie.scalar(80, out='unit')`.

Built-in functions:

| Call | Makes |
| --- | --- |
| `pie.scalar(value)` | a number |
| `pie.text(value)` | a string |
| `pie.point(x, y)` | a point |
| `pie.line(p1, p2)` | a line |
| `pie.distance(p1, p2)` | a number |
| `pie.triangle(v1, v2, v3)` | a triangle |
| `pie.circle(center, radius)` | a circle |
| `pie.ellipse(center, radius_x, radius_y, rotation)` | an ellipse; rotation in degrees |
| `pie.ellipse_from_foci(f1, f2, string_length)` | an ellipse |
| `pie.arc(center, radius, start_angle, end_angle)` | an arc; angles in degrees |
| `pie.bezier_quadratic(p1, control, p2)` | a curve |
| `pie.bezier_cubic(p1, control1, control2, p2)` | a curve |
| `pie.partial(target, var)` | the derivative of scalar `target` with respect to `var`. `var` is a scalar node (gives a number) or a point node (gives an arrow at the point). |

Arguments can be nodes or plain numbers. Passing an array where one item is expected runs the function once per item (except `partial`).

### Side effects

These change existing nodes instead of making a new one. They run once, when called.

| Call | Does |
| --- | --- |
| `pie.clear()` | removes every node and resets `unit` (pixels per grid unit) to 50 |
| `pie.translate_point_to(p, x, y)` | moves point `p` to (x, y) |
| `pie.translate_point_by(p, dx, dy)` | moves point `p` by (dx, dy) |
| `pie.translate_scalar_to(s, value)` | sets scalar `s` to `value` |
| `pie.translate_scalar_by(s, delta)` | adds `delta` to scalar `s` |

- `p` or `s` can be an array: every item moves.
- A moved node stops following the nodes it was built from. Nodes built from it follow the move.

### Lifting a Python function: `pie.lift`

`pie.lift(f, out_type)` turns a plain Python function into one that takes nodes and returns a node. It reruns when its input nodes change. `out_type` is one of `pie.Scalar`, `pie.Point`, `pie.Array[pie.Scalar]`, `pie.Array[pie.Point]`.

```python
import numpy as np
linspace = pie.lift(np.linspace, out_type=pie.Array[pie.Scalar])
n = pie.scalar(5, out='n')
xs = linspace(0, n, 5)
pie.point(xs, 0)          # 5 points from 0 to 5; set `n` again and they move
```

Limits:

- A lifted function can't call `pie.*` or index arrays.
- `pie.partial` can't differentiate through a lifted function.

## Your own functions: `functions/`

Each `functions/**/*.ts` file exports one or more `Node2NodeFunc` objects. Each becomes `pie.<keyword>` in Python. Copy `functions/midpoint.ts` as a starting point:

```ts
import { Node2NodeFunc } from '~/lib/nodes/functions/Node2NodeFunc';
import { AnyNode, PointNode } from '~/lib/nodes/state/Node';
import { add, div, ref, scalar } from '~/lib/nodes/jax';

export const Midpoint: Node2NodeFunc = {
  keyword: 'midpoint', outputType: 'Point',
  parameters: [{ name: 'point1', type: 'Point' }, { name: 'point2', type: 'Point' }],
  compute(inputs: AnyNode[]) {
    const p1 = inputs[0] as PointNode;
    const p2 = inputs[1] as PointNode;
    return {
      main: { type: 'Point', x: div(add(ref(p1.x), ref(p2.x)), scalar(2)), y: div(add(ref(p1.y), ref(p2.y)), scalar(2)) },
    };
  },
};
```

- `compute` returns an object whose `main` entry is the output node. Other entries are extra nodes drawn alongside it.
- Do the math with the helpers in `~/lib/nodes/jax` (`add`, `sub`, `mul`, `div`, `sqrt`, `sin`, `cos`, `atan2`, …), not plain JS operators. Wrap a node's number field in `ref(...)` before using it. These keep `pie.partial` working on your function.
- Node types and their fields are in `src/lib/nodes/state/Node.ts`.
- A file can also export a `SideEffectFunc` (same module as `Node2NodeFunc`): `keyword`, `parameters`, and `run(inputs, store)`, which changes the store instead of returning nodes. See `src/lib/nodes/functions/sideEffects.ts`.
- A keyword used twice, by two of your files or by yours and a built-in, fails the build.

## Your own node types: `nodes/`

Each `nodes/**/*.{ts,tsx}` file exports one or more `NodeDefinition` objects. Each adds a node type that functions can output and the canvas draws. Copy `nodes/square.tsx` as a starting point:

```tsx
import type { Accessor } from 'solid-js';
import type { Node, NodeDefinition, PointNode, ScalarNode } from '~/lib/nodes/state/Node';
import { num } from '~/lib/nodes/jax';

export interface SquareNode extends Node {
  type: 'Square';
  center: PointNode;
  side: ScalarNode;
}

// Adds 'Square' to the node types, so functions can take and return it.
declare module '~/lib/nodes/state/Node' {
  interface NodeTypeMap {
    Square: SquareNode;
  }
}

const renderSquare = (square: Accessor<SquareNode>) => {
  const side = () => num(square().side.value);
  return (
    <rect
      x={num(square().center.x) - side() / 2}
      y={num(square().center.y) - side() / 2}
      width={side()}
      height={side()}
      fill="none" stroke="currentColor" stroke-width={2} vector-effect="non-scaling-stroke"
    />
  );
};

export const Square: NodeDefinition<SquareNode> = { type: 'Square', prefix: 'sq', render: renderSquare };
```

- `type`: the type name. It must match the interface's `type`.
- `prefix`: the start of automatic ids: `sq` gives `sq0`, `sq1`, …. Default: the type name in lower case.
- `render(node, unit)`: returns Solid SVG elements, in grid units. `node()` returns the node's current data. Call it inside the JSX attributes, so the drawing updates when the node changes. `unit` is pixels per grid unit: divide by it for a size that stays fixed on screen. Leave `render` out for a node that isn't drawn.
- `num(...)` turns a node's number field into a plain JS number.
- The `declare module` block is needed so that a `Node2NodeFunc` accepts the type in `outputType` and `parameters`.
- Python makes a node of your type through a function in `functions/`. `functions/square.ts` adds `pie.square(center, side)`.
- The built-in node types are in `src/lib/nodes/state/Node.ts`, and their render functions are in `src/lib/nodes/render/renderLogic.tsx`.
- A type name used twice, by two of your files or by yours and a built-in, fails the build.

## Layouts: `layouts/`

- `layouts/header.tsx`: replaces the header on every page.
- `layouts/index.tsx`: replaces the homepage.

Each must `export default` a Solid component (Solid JSX: `class`, not `className`). Delete the file to get the built-in one back. `header.tsx` shows how to read `site.yml`: `import site from "../site.yml"`.

## Styles: `styles/`

Change the CSS variables in `styles/theme.css` (colors, fonts, text width), or add rules, e.g. `main h1 { color: crimson; }`.

## Build checks

`npm run build` fails, with a message naming the file, when:

- a page's frontmatter or `site.yml` has a bad line or value, or `site.yml` has no `title`
- a page's URL matches a route in `src/routes/`
- a `functions/` keyword is used twice
- a `nodes/` type name is used twice
- a `layouts/` file has no default export

Run `npm run build` after a change to confirm it.
