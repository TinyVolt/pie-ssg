---
toc: true
sidebar: _topics.md
canvas: right
---
# Table of contents test

### Before any h2

Should be a top-level entry.

## The $\nabla$ operator

Math in a heading.

### Sub *one*

Nested under the operator.

### Sub two

Also nested.

## Repeat

First "Repeat", links to `#repeat`.

## Repeat

Second "Repeat", links to `#repeat-2`.

#### Deep

Not listed: only `##` and `###` are.

## Last

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Generative UI

Run the blocks in order. Most examples start with `pie.clear()`, which removes every node, so the UIs of earlier examples hide.

### One Scalar, three UIs

Move the slider: the text box, the LaTeX and the circle follow. Type `2.5` in the text box and press Enter: the slider moves. Collapse the editor: the UIs stay. Run it again: the UIs are replaced, not doubled.

```python-editor
r = pie.scalar(1, out='r')
c = pie.point(0, 0, out='c')
pie.circle(c, r)
pie.ui.slider(r, min=0, max=4, label='radius')
pie.ui.textbox(r)
pie.ui.latex(r)
```

A UI for `r` from another block. It stays in sync with the ones above.

```python-editor
pie.ui.slider(r, min=0, max=4, step=0.5)
```

Remove `r`: its UIs in both blocks hide, and so does the circle. Run the first block again to bring them back.

```python-editor
pie.remove(r)
```

### Radio and slider: pick a function

The radio button sets `choice` to 0, 1 or 2. The slider sets the amplitude.

```python-editor
import numpy as np
pie.clear()
choice = pie.scalar(0, out='choice')
amp = pie.scalar(1, out='amp')

def curve(k, a):
    xs = np.linspace(-4, 4, 81)
    f = [np.sin, np.cos, np.tanh][int(k)]
    return np.stack([xs, a * f(xs)], axis=1)

pie.lift(curve, pie.Array[pie.Point])(choice, amp)
pie.ui.radio(choice, options=['sin', 'cos', 'tanh'])
pie.ui.slider(amp, min=-2, max=2, label='amplitude')
pie.ui.latex(choice, amp)
```

### Checkboxes: build a square wave

Each checkbox adds one odd harmonic. Tick them all to get close to a square wave.

```python-editor
import numpy as np
pie.clear()
harmonics = pie.scalar([1, 0, 0, 0, 0], out='harmonics')

def wave(mask):
    xs = np.linspace(-4, 4, 161)
    ys = sum(m * np.sin((2 * k + 1) * xs) / (2 * k + 1) for k, m in enumerate(mask))
    return np.stack([xs, 4 / np.pi * ys], axis=1)

pie.lift(wave, pie.Array[pie.Point])(harmonics)
pie.ui.checkboxes(harmonics, options=['sin x', 'sin 3x', 'sin 5x', 'sin 7x', 'sin 9x'])
pie.ui.latex(harmonics)
```

### Text box and slider: a label on the canvas

```python-editor
pie.clear()
label = pie.text('Hello', out='label')
size = pie.scalar(24, out='size')
pie.text(label, 0, 0, size)
pie.ui.textbox(label)
pie.ui.slider(size, min=8, max=60, step=1, label='font size')
```

### Text box and LaTeX: a live formula

A Text node holds LaTeX source. Edit it and press Enter.

```python-editor
formula = pie.text(r'e^{i\pi} + 1 = 0', out='formula')
pie.ui.textbox(formula)
pie.ui.latex(formula)
```

### Matrix playground

`q = m p`. The sliders set the items of `m`. Drag `p` on the canvas: the LaTeX and `q` follow.

```python-editor
import numpy as np
pie.clear()
m = pie.scalar([[1, 0], [0, 1]], out='m')
o = pie.point(0, 0, out='o')
p = pie.point(1, 1, out='p')

def apply(m, p):
    return tuple(m @ np.array(p))

q = pie.lift(apply, pie.Point)(m, p, out='q', fill='crimson')
pie.line(o, p)
pie.line(o, q, stroke='crimson')
eq = pie.text('=', out='eq')
pie.ui.latex(m, p, eq, q)
for i in range(2):
    for j in range(2):
        pie.ui.slider(m[i, j], min=-2, max=2, label=f'm[{i}, {j}]')
```

### Canvas controls

UIs on the system nodes. Zooming or panning the canvas moves the sliders too. `pie.clear()` resets these nodes, and the UIs keep following them.

```python-editor
pie.ui.radio(pie.get_node('gridOpacity'), options=['grid off', 'grid on'])
pie.ui.slider(pie.get_node('unit'), min=10, max=120, step=1, label='zoom')
pie.ui.slider(pie.get_node('originX'), min=-5, max=5, label='origin x')
pie.ui.slider(pie.get_node('originY'), min=-5, max=5, label='origin y')
```

### Errors

A wrong node type: the error shows in red below the editor. Python doesn't raise.

```python-editor
pie.ui.slider(pie.point(0, 0))
```

An unknown UI: Python raises.

```python-editor
pie.ui.dial(pie.scalar(1))
```

A node in a keyword argument: Python raises.

```python-editor
n = pie.scalar(1)
pie.ui.slider(n, max=n)
```
