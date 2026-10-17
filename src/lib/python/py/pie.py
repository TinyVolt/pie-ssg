import json
from pyodide.ffi import run_sync, to_js
from js import Object
import bridge

class Node:
    def __init__(self, id, type):
        self.id = id
        self.type = type

    def __repr__(self):
        return f"{self.type}({self.id})"

class Array(Node):
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
    return Node(result.id, result.type)

def _arg(a):
    if isinstance(a, Node):
        return {"id": a.id}
    if isinstance(a, (list, tuple)):
        return [_arg(x) for x in a]
    return a

def _call(name, args, out=None):
    js_args = to_js([_arg(a) for a in args], dict_converter=Object.fromEntries)
    return _node(run_sync(bridge.call(name, js_args, out)))

def __getattr__(name):
    if name.startswith("_"):
        raise AttributeError(name)
    def fn(*args, out=None):
        return _call(name, args, out)
    return fn
