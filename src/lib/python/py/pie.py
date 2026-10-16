from pyodide.ffi import run_sync, to_js
from js import Object
import bridge

class Node:
    def __init__(self, id, type):
        self.id = id
        self.type = type

    def __repr__(self):
        return f"{self.type}({self.id})"

def _arg(a):
    if isinstance(a, Node):
        return {"id": a.id}
    if isinstance(a, (list, tuple)):
        return [_arg(x) for x in a]
    return a

def __getattr__(name):
    if name.startswith("_"):
        raise AttributeError(name)
    def fn(*args, out=None):
        js_args = to_js([_arg(a) for a in args], dict_converter=Object.fromEntries)
        result = run_sync(bridge.call(name, js_args, out))
        return Node(result.id, result.type)
    return fn
