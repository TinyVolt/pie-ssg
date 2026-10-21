### Markdown only
Use a markdown to create content of any format (article, slideshow etc)

Design choices: 
- use `marked` and `katex`.

---

### ✅ Python for programmatic tasks
Rationale: Certain features like interactivity or visualization still require programming. The burden of programming on an author or reader can be lightened by:
- using Python as the primary language for all tasks.
- creating declarative, intuitive APIs - this is especially true for `pie.*`.

Design choices: 
- typescript functions implemented in `src/lib/nodes/functions` can be called from Python directly using `pie.<function_keyword>`. This allows the author to create an API for readers to use and interact with. 
  - Make it easier to extend function registry (in TS).
- Access to Python editor
  - should run locally on the reader's browser
  - primarily as code fences in the markdown 
  - Design choices:
    - Using code fence \`\`\`python-editor ... \`\`\` adds a Python editor to the document. 
    - Powered by `pyodide`. Async behavior is hidden using sync commands using `run_sync`.
    - Pyodide is downloaded from a CDN and runs in a web worker in the reader's browser. Python has no direct access to the DOM. All communication happens using the message API. 

---

### ✅ Access to Python scientific computing toolkit 
Packages like `numpy`, `scipy` and `matplotlib` should be available in the editor.

Design choices: 
- use `loadPackagesFromImports` to import a package on run time. It includes all three packages. It works for the packages listed [here](https://pyodide.org/en/0.28.2/usage/packages-in-pyodide.html).

---

### ✅ Reactivity
Updating a variable should update all downstream values automatically, something that was missing in jupyter notebooks and which marimo solved by implementing their own topological sorting logic. 

Design choices:
- use SolidJS store. It comes with reactivity baked in. 

**Note**: there is no reactivity across Python editors. They share a global scope but can be run in any order. Only the canvas is reactive. 

---

### ✅ Autodiff
It should be available as a native feature.

Design choices:
- Use `jax-js` with some custom code to replay the function to be differentiated. The replay should be smart enough to allow nested differentiation. Eg `grad ( grad(f, x), y)` should work. 

---

### ✅ Tensors and broadcasting
A function defined for type `T` should also work for an array of type `T` - another feature pretty common in scientific computing. 

Design choices:
- Add a new array node in `Node.ts`.
- Write basic multi-dimensional array logic in `/src/lib/nodes/tensors` on the JS side and extend the definition of `Node` indexing using `__getitem__` on the Python side. 

---

### ✅ A canvas for visualization
Allow a user to add a canvas to an article for visualization. It should be interactable with Python code from inside a Python editor.

Design choices:
- Adding `canvas: left` to the frontmatter adds a canvas to the left half of the screen. Other options are `right`, `top`, `bottom` and `none` (default). 
- Each Python editor comes with `pie` loaded. `pie.x` calls the function `x` in the function registry.  

