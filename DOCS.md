In addition to a general markdown based SSG, `pie` provides some additional features as laid out in the [roadmap](ROADMAP.md). Here is how to use those features:

## A canvas for visualization
Use the frontmatter `canvas` prop to add a canvas to the page. Accepted values are `left`, `right`, `top`, `bottom` and `none` (default).

Each element on the canvas is a `Node`. Each `Node` has an `id`. 

There are three system nodes:
- `unit`: a scalar holding the pixels per grid unit (default 50). Changing it changes the grid unit, e.g. `pie.scalar(80, out='unit')`.
- `gridOpacity`: a scalar that multiplies the opacity of the grid lines and axes (default 1; 0 hides them), e.g. `pie.scalar(0.5, out='gridOpacity')`.
- `canvasColor`: a text holding a CSS color for the canvas background (default `''`: no background), e.g. `pie.text('#111', out='canvasColor')`.

---

## Python editor
Use the code fence `python-editor` creates a python editor with button to run and stop the code it contains. Use `` ```python-editor collapsed `` to start an editor in collapsed mode. 

One of the items in the roadmap is "Python for all programmatic tasks". It allows a reader to use Python to create visualizations and animations in the canvas (which would otherwise require JS) in addition to just running pure Python code. There are two ways to do so:
- calling custom JS functions
- calling custom and in-built Python functions

---

## Calling custom JS functions
All `Node2NodeFunc` type functions defined in `src/lib/nodes/functions` are available in Python under `pie.*` namespace. A function's `keyword` prop is used for this purpose. Eg `Point` has a keyword `point`. In Python, one can create a point like so: `pie.point(1,2)`.

**Caveat**
A node is automatically specified an ID. To provide an ID to node, use `out=<id>`. Eg `pie.point(1,2,out='center')`. A common mistake is to write `center = pie.point(1,2)` and assume that the generated point has an ID of `center`. 

### Colors
Use `fill=<color>` and `stroke=<color>` to color a node. Eg `pie.circle(c, 2, fill='orange', stroke='#333')`. A color is any CSS color (eg `'red'`, `'#ff0000'`, `'rgb(255, 0, 0)'`) or `'none'`. A bad color raises an error. Also works for lifted functions (see `pie.lift` below) - they accept `fill` and `stroke` too.

Every node a call makes gets the colors, including extra nodes such as the center point of `ellipse_from_foci`. 

To change the colors later, use `pie.set_fill(node, color)` and `pie.set_stroke(node, color)`. `node` can be an array, in which case every item changes.

### Removing
Use `pie.remove(node)` to remove a node. Nodes built from it are removed too. If a list of nodes is passed, it removes each item in that list.

### Animation
`pie.translate_point_to`, `pie.translate_point_by`, `pie.translate_scalar_to` and `pie.translate_scalar_by` take `animate=True`. The value then moves to its new value over half a second instead of jumping. Eg `pie.translate_point_to(p, 3, 4, animate=True)`. The call returns when the move ends, so a loop of animated calls plays one after another. If `p` is an array, its items move together. Other functions raise an error if passed `animate`.

### Extending JS functions
One can define their own `Node2NodeFunc` under `/functions` folder. It will automatically become available under `pie.*` in Python. Eg `/functions/midpoint.ts` implements `Midpoint` with keyword `midpoint`. In a Python editor, a user can type `pie.midpoint(p1, p2)` to draw a mid-point of points `p1` and `p2`. 

---

### Extending nodes
One can define their own node types under `/nodes` folder. Each file exports one or more `NodeDefinition` objects with three props:
- `type`: the node's type name, eg `Square`.
- `prefix`: the start of auto-generated IDs, eg `sq` gives `sq0`, `sq1`, ...
- `render`: a function that draws the node on the canvas. Skip it for a node that is not drawn. To support colors, use `node().fill` and `node().stroke` before your defaults, eg `fill={square().fill ?? 'none'}`. Otherwise the node ignores them.

Eg `/nodes/square.tsx` defines a `Square` node. Its `declare module` block adds `Square` to the node types, so a function can output it. `/functions/square.ts` implements it, so a user can type `pie.square(p, 2)` to draw a square of side `2` centered at point `p`.

---

## Calling in-built Python functions
One can also lift a regular Python function to become a `Node2NodeFunc`-like function which accepts nodes as inputs and returns nodes as outputs using `pie.lift`. `pie.lift` takes two arguments:
1. the function to lift, `f`
2. the output node type - one of `pie.Scalar`, `pie.Point`, `pie.Text` (or `str`), `pie.Array[pie.Scalar]` or `pie.Array[pie.Point]`. 

```python
import numpy as np 
linspace = pie.lift(np.linspace, out_type=pie.Array[pie.Scalar])
n = pie.scalar(5, out='n')
xs = linspace(0, n, 5)
pie.point(xs, 0)
```

It creates 5 points regularly spaced between `0` and `5`. Changing `n` later updates the points accordingly:

```python
pie.scalar(3, out='n')
```

Now the points are regularly spaced between `0` and `3`. 

---

## Styling
Add or modify the existing style in `/styles` folder. Every `.css` file under the `/styles` folder is loaded after the built-in `src/app.css`, so its rules override the defaults. Change the CSS variables in `/styles/theme.css` (colors, fonts, text width), or add your own rules, eg `main h1 { color: crimson; }`.

---

## Homepage and header 
The root folder `/layouts` provides `index.tsx` and `header.tsx` to customize the homepage and the header. Each file must default-export a Solid component otherwise the build will fail. 

**Caveat**
`pages/index.md` is served at `/index`, not `/`. The homepage always comes from `/layouts/index.tsx`.

---

## SEO
Set `url` in `site.yml` (eg `url: https://example.com`) before deploying. The build then writes `sitemap.xml` (every page) and `robots.txt` (pointing to the sitemap), and every page gets a canonical link and `og:url`. Without `url`, the build skips these and warns. A file of the same name in `/public` replaces the generated one.

Every page also gets `og:title`, `og:site_name` and, if set, a description: the page's frontmatter `description`, or else `site.yml`'s `description`.

---

## Examples

Coming soon. 