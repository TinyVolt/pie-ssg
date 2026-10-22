In addition to a general markdown based SSG, `pie` provides some additional features as laid out in the [roadmap](ROADMAP.md). Here is how to use those features:

## A canvas for visualization
Use the frontmatter `canvas` prop to add a canvas to the page. Accepted values are `left`, `right`, `top`, `bottom` and `none` (default).

Each element on the canvas is a `Node`. Each `Node` has an `id`. 

---

## Python editor
Use the code fence `python-editor` creates a python editor with button to run and stop the code it contains. 

One of the items in the roadmap is "Python for all programmatic tasks". It allows a reader to use Python to create visualizations and animations in the canvas (which would otherwise require JS) in addition to just running pure Python code. There are two ways to do so:
- calling custom JS functions
- calling custom and in-built Python functions

---

## Calling custom JS functions
All `Node2NodeFunc` type functions defined in `src/lib/nodes/functions` are available in Python under `pie.*` namespace. A function's `keyword` prop is used for this purpose. Eg `Point` has a keyword `point`. In Python, one can create a point like so: `pie.point(1,2)`.

**Caveat**
A node is automatically specified an ID. To provide an ID to node, use `out=<id>`. Eg `pie.point(1,2,out='center')`. A common mistake is to write `center = pie.point(1,2)` and assume that the generated point has an ID of `center`. 

### Extending JS functions
One can define their own `Node2NodeFunc` under `/functions` folder. It will automatically become available under `pie.*` in Python. Eg `/functions/midpoint.ts` implements `Midpoint` with keyword `midpoint`. In a Python editor, a user can type `pie.midpoint(p1, p2)` to draw a mid-point of points `p1` and `p2`. 

---

## Calling in-built Python functions
One can also lift a regular Python function to become a `Node2NodeFunc`-like function which accepts nodes as inputs and returns nodes as outputs using `pie.lift`. `pie.lift` takes two arguments:
1. the function to lift, `f`
2. the output node type - one of `pie.Scalar`, `pie.Point`, `pie.Array[pie.Scalar]` or `pie.Array[pie.Point]`. 

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

## Examples

Coming soon. 