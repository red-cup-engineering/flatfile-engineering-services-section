"""Pytest config — adds ``src/`` to sys.path so ``import pypredcalc`` resolves
to the local source tree without needing an editable install (which fails
against Replit's read-only Nix store).
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
