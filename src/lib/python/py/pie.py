import json, numbers, sys, types
from pyodide.ffi import run_sync, to_js
from js import Object
import bridge

class Node:
    def __init__(self, id, type):
        self.id = id
        self.type = type

    def __repr__(self):
        return f"{self.type}({self.id})"

class Scalar(Node):
    def __init__(self, id):
        super().__init__(id, "Scalar")

class Point(Node):
    def __init__(self, id):
        super().__init__(id, "Point")

class Array(Node):
    # `pie.Array[pie.Point]`, a type for `pie.lift`.
    def __class_getitem__(cls, item):
        return types.GenericAlias(cls, item)

    def __init__(self, id, shape, item_type):
        super().__init__(id, "Array")
        self.shape = shape
        self.item_type = item_type

    def __len__(self):
        return self.shape[0]

    def __repr__(self):
        return f"Array[{self.item_type}]({self.id}, shape={self.shape})"

    def __getitem__(self, key):
        key = key if isinstance(key, tuple) else (key,)
        if len(key) > len(self.shape):
            raise IndexError(f"too many indices: the array has {len(self.shape)} dimensions, got {len(key)}")
        entries = [_index_entry(k, n) for k, n in zip(key, self.shape)]
        # One int per dimension picks an existing item: no new node.
        if len(entries) == len(self.shape) and all(isinstance(e, int) for e in entries):
            position = 0
            for e, n in zip(entries, self.shape):
                position = position * n + e
            _check_bridge()
            return _node(run_sync(bridge.item(self.id, position)))
        return _call("_index", [self, json.dumps(entries)])

def _index_entry(k, n):
    """One dimension of a key, for a dimension of size `n`: an int, or the list of ints a slice picks."""
    if isinstance(k, slice):
        return list(range(*k.indices(n)))
    if isinstance(k, int):
        if not -n <= k < n:
            raise IndexError(f"index {k} is out of range for size {n}")
        return k % n
    raise TypeError(f"array indices must be ints or slices, got {type(k).__name__}")

def _node(result):
    if result.type == "Array":
        return Array(result.id, tuple(result.shape), result.itemType)
    if result.type == "Scalar":
        return Scalar(result.id)
    if result.type == "Point":
        return Point(result.id)
    return Node(result.id, result.type)

def _arg(a):
    if isinstance(a, Node):
        return {"id": a.id}
    if isinstance(a, (list, tuple)):
        return [_arg(x) for x in a]
    return a

def _call(name, args, **options):
    """`options`: keyword arguments like `out` and `fill`. Ones that are None are left out."""
    _check_bridge()
    js_args = to_js([_arg(a) for a in args], dict_converter=Object.fromEntries)
    js_options = to_js({k: v for k, v in options.items() if v is not None}, dict_converter=Object.fromEntries)
    return _node(run_sync(bridge.call(name, js_args, js_options)))

# Above 0 while a function passed to `pie.lift` runs. It can't reach the page: a rerun runs outside any block.
_lift_depth = 0

def _check_bridge():
    if _lift_depth:
        raise RuntimeError("pie.* calls and array indexing aren't allowed inside a function passed to pie.lift")

# Type passed to `pie.lift` -> (kind, item type).
_RETURNS = [
    (Scalar, ("Scalar", None)),
    (Point, ("Point", None)),
    (Array[Scalar], ("Array", "Scalar")),
    (Array[Point], ("Array", "Point")),
]

class _Slot:
    """Where node argument `index` goes in a stored call."""
    def __init__(self, index):
        self.index = index

def lift(fn, out_type):
    """
    A regular Python function `fn` can be _lifted_ to accept nodes (Scalar, Point and Array)
    g = pie.lift(fn, out_type)
    - If `fn` returns a num, `g` returns `Scalar`, out_type = `Scalar`
    - If `fn` returns a tuple or array of len 2, `g` returns `Point`, out_type = `Point`
    - If `fn` returns a numpy array, `g` can return `Array[Point]` or `Array[Scalar]`
    """
    returns = next((r for t, r in _RETURNS if out_type == t), None)
    if returns is None:
        raise TypeError(f"pie.lift: out_type must be pie.Scalar, pie.Point, pie.Array[pie.Scalar] or pie.Array[pie.Point], got {out_type!r}")
    # The page's globals: `lift` is called from a block.
    scope = sys._getframe(1).f_globals
    name = getattr(fn, "__name__", None)
    # A function defined in a block is found by name, so a later `def f` is used. Anything else, e.g. np.linspace, by reference.
    target = name if name is not None and scope.get(name) is fn else fn
    label = name or repr(fn)

    def lifted(*args, out=None, hidden=False, fill=None, stroke=None, **kwargs):
        return _lifted_node(scope, target, label, returns, args, kwargs, out, hidden, fill, stroke)
    lifted.__name__ = lifted.__qualname__ = f"lift({label})"
    return lifted

def _lifted_node(scope, target, label, returns, args, kwargs, out, hidden, fill, stroke):
    _check_bridge()
    ids = []
    def slot(a):
        if not isinstance(a, Node):
            return a
        ids.append(a.id)
        return _Slot(len(ids) - 1)
    # The call, with node arguments as slots. Reruns fill the slots with new values; other arguments stay as they are.
    call = (target, label, [slot(a) for a in args], {k: slot(v) for k, v in kwargs.items()}, returns)
    kind, item = returns
    reply = run_sync(bridge.lift(label, to_js(ids), kind, out, fill, stroke))
    shape, values = _evaluate(scope, call, reply.values.to_py())
    save = {"id": reply.id, "name": label, "inputIds": ids, "kind": kind, "itemType": item, "shape": shape, "values": values, "hidden": hidden, "fill": fill, "stroke": stroke}
    bridge.lift_save(to_js(save, dict_converter=Object.fromEntries))
    scope.setdefault("__pie_lift__", {})[reply.id] = call
    if kind == "Array":
        return Array(reply.id, tuple(shape), item)
    return Scalar(reply.id) if kind == "Scalar" else Point(reply.id)

def _rerun(scope, node_id, values):
    """Called by the worker when an input of node `node_id` changes. `values`: the input values, in slot order."""
    call = scope.get("__pie_lift__", {}).get(node_id)
    if call is None:
        raise RuntimeError("Python was restarted, so this node can't rerun. Run the block that made it again.")
    shape, values = _evaluate(scope, call, values)
    return {"shape": shape, "values": values}

def _evaluate(scope, call, values):
    """Calls the function: by name, the one now named so in `scope`; otherwise the one kept."""
    global _lift_depth
    target, label, args, kwargs, returns = call
    if isinstance(target, str):
        if target not in scope:
            raise NameError(f"name '{target}' is not defined")
        fn = scope[target]
    else:
        fn = target
    # A Scalar's value arrives as a number, a Point's as [x, y], an Array's as {shape, values}.
    def fill(a):
        if not isinstance(a, _Slot):
            return a
        v = values[a.index]
        if isinstance(v, dict):
            import numpy as np
            return np.array(v["values"]).reshape(v["shape"])
        return tuple(float(c) for c in v) if isinstance(v, list) else float(v)
    _lift_depth += 1
    try:
        result = fn(*map(fill, args), **{k: fill(v) for k, v in kwargs.items()})
    finally:
        _lift_depth -= 1
    return _check_out_type_and_flatten(label, returns, result)

def _is_number(v):
    return isinstance(v, numbers.Real)

def _check_out_type_and_flatten(name, returns, result):
    """`result` as (shape, values): every number in row-major order, a Point as x, y."""
    kind, item = returns
    if kind == "Scalar":
        if not _is_number(result):
            raise TypeError(f"{name} is lifted to pie.Scalar, so it must return a number, got {type(result).__name__}")
        return [], [float(result)]
    if kind == "Point":
        if not (isinstance(result, (tuple, list)) and len(result) == 2 and all(map(_is_number, result))):
            raise TypeError(f"{name} is lifted to pie.Point, so it must return a tuple or list of 2 numbers, got {type(result).__name__}")
        return [], [float(c) for c in result]
    lifted_to = f"lifted to pie.Array[pie.{item}]"
    np = sys.modules.get("numpy")
    if np is None or not isinstance(result, np.ndarray):
        raise TypeError(f"{name} is {lifted_to}, so it must return a numpy array, got {type(result).__name__}")
    if result.dtype.kind not in "biuf":
        raise TypeError(f"{name} is {lifted_to}, so its array must hold numbers, got dtype {result.dtype}")
    if item == "Point" and (result.ndim < 2 or result.shape[-1] != 2):
        raise ValueError(f"{name} is {lifted_to}, so its array's shape must end in 2, with at least 2 dimensions, got {result.shape}")
    if result.ndim < 1:
        raise ValueError(f"{name} is {lifted_to}, so its array needs at least 1 dimension, got shape {result.shape}")
    if result.size == 0:
        raise ValueError(f"{name} returned an empty array, shape {result.shape}")
    shape = result.shape[:-1] if item == "Point" else result.shape
    return list(shape), result.astype(np.float64).ravel().tolist()

def __getattr__(name):
    if name.startswith("_"):
        raise AttributeError(name)
    def fn(*args, out=None, hidden=None, fill=None, stroke=None, animate=None):
        return _call(name, args, out=out, hidden=hidden, fill=fill, stroke=stroke, animate=animate)
    return fn
