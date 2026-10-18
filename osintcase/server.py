"""Tiny local static server for the bundled OSINT Case web app (127.0.0.1 only)."""

from __future__ import annotations

import mimetypes
import posixpath
import socket
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

STATIC_DIR = Path(__file__).resolve().parent / "static"
DEFAULT_PORT = 47321  # fixed so the browser keeps the same origin (and saved data) between runs

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("font/woff2", ".woff2")


class _Handler(SimpleHTTPRequestHandler):
    server_version = "OsintCase"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    # Block DNS-rebinding style requests: only accept local Host headers.
    def _host_ok(self) -> bool:
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0].strip("[]").lower()
        return host in {"127.0.0.1", "localhost", "::1"}

    def do_GET(self):  # noqa: N802
        if not self._host_ok():
            self.send_error(403, "Forbidden")
            return
        super().do_GET()

    def do_HEAD(self):  # noqa: N802
        if not self._host_ok():
            self.send_error(403, "Forbidden")
            return
        super().do_HEAD()

    def translate_path(self, path: str) -> str:
        path = posixpath.normpath(unquote(urlsplit(path).path))
        if path in ("", ".", "/"):
            path = "/index.html"
        target = (STATIC_DIR / path.lstrip("/")).resolve()
        if STATIC_DIR not in target.parents and target != STATIC_DIR:
            return str(STATIC_DIR / "index.html")
        return str(target)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def log_message(self, fmt, *args):  # quiet by default
        pass


def _port_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((host, port))
        except OSError:
            return False
    return True


def start(port: int | None = None, host: str = "127.0.0.1") -> tuple[ThreadingHTTPServer, str, bool]:
    """Start the server in a daemon thread.

    Returns (server, url, port_changed). If the preferred port is busy a random free
    port is used (saved browser data is per-origin, so the caller may want to warn).
    """
    if not (STATIC_DIR / "index.html").is_file():
        raise RuntimeError(
            "Bundled web app not found. Reinstall the package, or run tools/build_pypi.sh in the source tree."
        )
    wanted = port if port else DEFAULT_PORT
    changed = False
    if not _port_free(host, wanted):
        wanted, changed = 0, True
    httpd = ThreadingHTTPServer((host, wanted), _Handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, name="osintcase-http", daemon=True).start()
    return httpd, f"http://{host}:{httpd.server_address[1]}/", changed
