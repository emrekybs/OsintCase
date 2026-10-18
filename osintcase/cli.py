from __future__ import annotations

import argparse
import ctypes
import os
import platform
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

from . import __version__, server, shortcut

ICON = Path(__file__).resolve().parent / "assets" / "icon.png"


VENDOR = Path(__file__).resolve().parent / "_vendor" / "linux-x86_64"


def _window_env() -> dict:
    """On Linux, Qt needs a few small XCB libraries that some distributions do not install
    (libxcb-cursor0 above all). Copies of them ship with the package; any the system lacks
    are linked into a private folder that is put on LD_LIBRARY_PATH for the window only."""
    env = os.environ.copy()
    if not sys.platform.startswith("linux") or platform.machine() not in ("x86_64", "AMD64") or not VENDOR.is_dir():
        return env
    missing = []
    for lib in sorted(VENDOR.glob("lib*.so.*")):
        try:
            ctypes.CDLL(lib.name)
        except OSError:
            missing.append(lib)
    if not missing:
        return env
    libdir = shortcut.DATA_DIR / "libs"
    try:
        libdir.mkdir(parents=True, exist_ok=True)
        for old in libdir.iterdir():
            old.unlink()
        for lib in missing:
            (libdir / lib.name).symlink_to(lib)
    except OSError:
        libdir = VENDOR
    env["LD_LIBRARY_PATH"] = os.pathsep.join(filter(None, [str(libdir), env.get("LD_LIBRARY_PATH", "")]))
    return env


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="osintcase",
        description="OSINT Case — investigation case workspace. Opens in its own window by default.",
    )
    p.add_argument("--web", action="store_true", help="open in your web browser instead of a window")
    p.add_argument("--port", type=int, default=None, help=f"local port (default {server.DEFAULT_PORT})")
    p.add_argument("--no-open", action="store_true", help="with --web: start the server but do not open a browser")
    p.add_argument("--install-shortcut", action="store_true", help="add OSINT Case (with logo) to the application menu")
    p.add_argument("--uninstall-shortcut", action="store_true", help="remove the application menu entry")
    p.add_argument("--uninstall", action="store_true", help="remove the menu entry and uninstall OSINT Case")
    p.add_argument("--version", action="version", version=f"osintcase {__version__}")
    return p


def _serve_forever(url: str, open_browser: bool) -> int:
    print(f"OSINT Case {__version__} running at {url}  (Ctrl+C to stop)")
    if open_browser:
        webbrowser.open(url)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        print()
    return 0


def _gui(url: str) -> bool:
    """Open the native window in a child process. False means no window could be shown."""
    storage = shortcut.DATA_DIR / "webview"
    storage.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    try:
        rc = subprocess.run(
            [sys.executable, "-m", "osintcase._window", url, str(storage), str(ICON)],
            env=_window_env(),
        ).returncode
    except OSError as exc:
        print(f"Could not start the window ({exc}).", file=sys.stderr)
        return False
    if rc == 0:
        return True
    if time.monotonic() - started > 20:  # it ran for a while and then died: do not reopen in a browser
        return True
    if sys.platform.startswith("linux"):
        print(
            "The window could not start; opening OSINT Case in your browser instead.",
            file=sys.stderr,
        )
    return False


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)

    if args.install_shortcut:
        for item in shortcut.install():
            print("created:", item)
        return 0
    if args.uninstall:
        return shortcut.uninstall_package()
    if args.uninstall_shortcut:
        for item in shortcut.remove():
            print("removed:", item)
        return 0

    try:
        _httpd, url, changed = server.start(args.port)
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1
    if changed:
        print("Note: default port is busy; using a different one. Saved browser data is per port.", file=sys.stderr)

    if args.web:
        return _serve_forever(url, not args.no_open)

    shortcut.ensure_once()
    if _gui(url):
        return 0
    print("Falling back to the browser (install a GUI toolkit or use --web explicitly).", file=sys.stderr)
    return _serve_forever(url, True)
