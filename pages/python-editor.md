---
canvas: right
---

# Examples of animating lifted functions

1. One lifted function. The point should trace a sine curve, not jump to the end.

```python-editor
import math
def wave(t):
    return (t, 2 * math.sin(t))
wave_point = pie.lift(wave, pie.Point)
t = pie.scalar(0, out='t')
wave_point(t)
pie.translate_scalar_to(t, 6, animate=True)
```

2. Change `t` after the animation. The point should jump to (1, 1.68) through a normal rerun.

```python-editor
pie.scalar(1, out='t')
```

3. Two lifted functions, one feeding the other. The point should slide from (0, 1) to (6, 1).

```python-editor
def double(x):
    return 2 * x
def on_line(x):
    return (x, 1)
double_l = pie.lift(double, pie.Scalar)
on_line_l = pie.lift(on_line, pie.Point)
s = pie.scalar(0, out='s')
on_line_l(double_l(s))
pie.translate_scalar_to(s, 3, animate=True)
```

4. A lifted function that returns an array. Five points should spread out smoothly from [0, 1] to [0, 5].

```python-editor
import numpy as np
linspace = pie.lift(np.linspace, pie.Array[pie.Scalar])
n = pie.scalar(1, out='n')
pie.point(linspace(0, n, 5), -2)
pie.translate_scalar_to(n, 5, animate=True)
```

5. A lifted function that fails partway. The point should move until x = 2 and then stop. The console should show one error: `fails_above_2: ValueError: too big`.

```python-editor
def fails_above_2(x):
    if x > 2:
        raise ValueError("too big")
    return (x, -1)
fails_l = pie.lift(fails_above_2, pie.Point)
u = pie.scalar(0, out='u')
fails_l(u)
pie.translate_scalar_to(u, 4, animate=True)
```
