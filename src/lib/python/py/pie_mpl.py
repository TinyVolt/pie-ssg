# Matplotlib backend: `plt.show()` sends each open figure to the editor as a PNG, then closes it.
import base64, io, sys
import bridge
from matplotlib._pylab_helpers import Gcf
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

def show(*args, **kwargs):
    # Text printed before the plot must reach the editor first.
    sys.stdout.flush()
    sys.stderr.flush()
    for manager in Gcf.get_all_fig_managers():
        buf = io.BytesIO()
        manager.canvas.figure.savefig(buf, format="png")
        bridge.plot(base64.b64encode(buf.getvalue()).decode())
    Gcf.destroy_all()
