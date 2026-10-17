# Shows the figures a run left open, then closes them so they don't carry over to the next run.
import sys
if "matplotlib.pyplot" in sys.modules:
    sys.modules["matplotlib.pyplot"].show()
    sys.modules["matplotlib.pyplot"].close("all")
