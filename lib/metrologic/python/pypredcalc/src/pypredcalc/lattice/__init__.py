"""Frame and d-frame primitives.

Realized:
- `frame` — `PowersetFrame` and frame morphisms (the only frames the
  finite-cellular settings need).
- `dframe` — `DFrame` (4-tuple `(L⁺, L⁻, con, tot)`) and the canonical
  bitopological-settling-site constructor.
"""

from .dframe import DFrame, settling_dframe_at_clopen
from .frame import FrameMorphism, PowersetFrame, restrict_with

__all__ = [
    "DFrame",
    "FrameMorphism",
    "PowersetFrame",
    "restrict_with",
    "settling_dframe_at_clopen",
]
