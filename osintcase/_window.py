"""Runs the native window. Started as a child process by cli.py so a missing system
library (for example libxcb-cursor0 for Qt) cannot take the whole program down."""

from __future__ import annotations

import os
import sys


def run(url: str, storage: str, icon: str) -> int:
    if sys.platform.startswith("linux"):
        os.environ.setdefault("PYWEBVIEW_GUI", "qt")  # skip the GTK probe (no 'gi' noise)
    import webview  # pywebview

    try:
        webview.settings["ALLOW_DOWNLOADS"] = True
    except Exception:
        pass
    webview.create_window("OSINT Case", url, width=1440, height=900, min_size=(1000, 640))
    webview.start(private_mode=False, storage_path=storage, icon=icon)
    return 0


if __name__ == "__main__":
    raise SystemExit(run(sys.argv[1], sys.argv[2], sys.argv[3]))
