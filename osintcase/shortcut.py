"""Create / remove the application-menu entry (with the logo icon).

Linux:   ~/.local/share/applications/osintcase.desktop + hicolor icons
Windows: Start Menu shortcut (OSINT Case.lnk) using icon.ico
macOS:   ~/Applications/OSINT Case.app (small launcher bundle)
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parent / "assets"
NAME = "OSINT Case"
DATA_DIR = Path(os.environ.get("OSINTCASE_HOME", Path.home() / ".osintcase"))
MARKER = DATA_DIR / ".shortcut-v1"


def _command() -> list[str]:
    """Absolute command that launches the GUI (works for pip, pipx and venvs)."""
    exe = shutil.which("osintcase")
    if exe and Path(exe).resolve().parent in {Path(sys.executable).resolve().parent, Path(sys.prefix).resolve() / "bin"}:
        return [exe]
    return [sys.executable, "-m", "osintcase"]


def _quote(parts: list[str]) -> str:
    return " ".join('"%s"' % p if (" " in p or "\\" in p) else p for p in parts)


# ---------------------------------------------------------------- Linux
def _linux_desktop_text() -> str:
    cmd = _command()
    return (
        "[Desktop Entry]\n"
        "Type=Application\n"
        f"Name={NAME}\n"
        "GenericName=Investigation case workspace\n"
        "Comment=Profiling, notes, link analysis and reports for OSINT investigations\n"
        f"Exec={_quote(cmd)}\n"
        # TryExec: when the package (its venv) is removed, desktops hide this entry by themselves
        f"TryExec={cmd[0]}\n"
        "Icon=osintcase\n"
        "Terminal=false\n"
        "Categories=Utility;Security;Network;\n"
        "StartupWMClass=osintcase\n"
        "Keywords=OSINT;investigation;case;intelligence;\n"
    )


def _linux_desktop_path() -> Path:
    base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return base / "applications" / "osintcase.desktop"


def _linux_install() -> list[str]:
    base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    made = []
    for size, src in ((256, "icon-256.png"), (512, "icon.png")):
        dst = base / "icons" / "hicolor" / f"{size}x{size}" / "apps" / "osintcase.png"
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ASSETS / src, dst)
        made.append(str(dst))
    desktop = _linux_desktop_path()
    desktop.parent.mkdir(parents=True, exist_ok=True)
    desktop.write_text(_linux_desktop_text(), encoding="utf-8")
    desktop.chmod(0o755)
    made.append(str(desktop))
    for tool, args in (
        ("update-desktop-database", [str(desktop.parent)]),
        ("gtk-update-icon-cache", ["-f", "-t", str(base / "icons" / "hicolor")]),
    ):
        if shutil.which(tool):
            subprocess.run([tool, *args], check=False, capture_output=True)
    return made


def _linux_remove() -> list[str]:
    base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    gone = []
    for p in (
        base / "applications" / "osintcase.desktop",
        base / "icons" / "hicolor" / "256x256" / "apps" / "osintcase.png",
        base / "icons" / "hicolor" / "512x512" / "apps" / "osintcase.png",
    ):
        if p.exists():
            p.unlink()
            gone.append(str(p))
    return gone


# -------------------------------------------------------------- Windows
def _win_lnk() -> Path:
    appdata = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    return appdata / "Microsoft" / "Windows" / "Start Menu" / "Programs" / f"{NAME}.lnk"


def _win_install() -> list[str]:
    ico = DATA_DIR / "osintcase.ico"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ASSETS / "icon.ico", ico)
    py = Path(sys.executable)
    pyw = py.with_name("pythonw.exe")
    target = str(pyw if pyw.exists() else py)
    lnk = _win_lnk()
    lnk.parent.mkdir(parents=True, exist_ok=True)
    ps = (
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%s');"
        "$s.TargetPath='%s';$s.Arguments='-m osintcase';$s.IconLocation='%s';"
        "$s.Description='%s';$s.WorkingDirectory='%s';$s.Save()"
    ) % (lnk, target, ico, NAME, Path.home())
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True, capture_output=True)
    return [str(lnk)]


def _win_remove() -> list[str]:
    lnk = _win_lnk()
    if lnk.exists():
        lnk.unlink()
        return [str(lnk)]
    return []


# ---------------------------------------------------------------- macOS
def _mac_app() -> Path:
    return Path.home() / "Applications" / f"{NAME}.app"


def _mac_install() -> list[str]:
    app = _mac_app()
    (app / "Contents" / "MacOS").mkdir(parents=True, exist_ok=True)
    (app / "Contents" / "Resources").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ASSETS / "icon.icns", app / "Contents" / "Resources" / "icon.icns")
    (app / "Contents" / "Info.plist").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
        '<plist version="1.0"><dict>'
        f"<key>CFBundleName</key><string>{NAME}</string>"
        f"<key>CFBundleDisplayName</key><string>{NAME}</string>"
        "<key>CFBundleIdentifier</key><string>com.osintcase.app</string>"
        "<key>CFBundleExecutable</key><string>osintcase</string>"
        "<key>CFBundleIconFile</key><string>icon</string>"
        "<key>CFBundlePackageType</key><string>APPL</string>"
        "<key>LSMinimumSystemVersion</key><string>10.13</string>"
        "</dict></plist>\n",
        encoding="utf-8",
    )
    launcher = app / "Contents" / "MacOS" / "osintcase"
    launcher.write_text("#!/bin/sh\nexec %s\n" % _quote(_command()), encoding="utf-8")
    launcher.chmod(0o755)
    return [str(app)]


def _mac_remove() -> list[str]:
    app = _mac_app()
    if app.exists():
        shutil.rmtree(app)
        return [str(app)]
    return []


# --------------------------------------------------------------- public
def install() -> list[str]:
    if sys.platform.startswith("linux"):
        made = _linux_install()
    elif sys.platform == "win32":
        made = _win_install()
    elif sys.platform == "darwin":
        made = _mac_install()
    else:
        raise RuntimeError(f"Shortcuts are not supported on {sys.platform}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MARKER.write_text("1", encoding="utf-8")
    return made


def remove() -> list[str]:
    if sys.platform.startswith("linux"):
        gone = _linux_remove()
    elif sys.platform == "win32":
        gone = _win_remove()
    elif sys.platform == "darwin":
        gone = _mac_remove()
    else:
        gone = []
    MARKER.unlink(missing_ok=True)
    # remember that the user removed it: do not recreate automatically
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / ".shortcut-declined").write_text("1", encoding="utf-8")
    return gone


def _exists() -> bool:
    if sys.platform.startswith("linux"):
        return _linux_desktop_path().exists()
    if sys.platform == "win32":
        return _win_lnk().exists()
    if sys.platform == "darwin":
        return _mac_app().exists()
    return True


def ensure_once() -> None:
    """GUI start: create the menu entry if it is missing (never raises).

    Skipped when the user removed it on purpose (--uninstall-shortcut) or set
    OSINTCASE_NO_SHORTCUT. If the entry exists but points somewhere else (package
    reinstalled into a new venv) it is refreshed.
    """
    if os.environ.get("OSINTCASE_NO_SHORTCUT") or (DATA_DIR / ".shortcut-declined").exists():
        return
    try:
        if not _exists():
            install()
        elif sys.platform.startswith("linux"):
            path = _linux_desktop_path()
            if path.read_text(encoding="utf-8") != _linux_desktop_text():
                install()
    except Exception:
        pass


def uninstall_package() -> int:
    """Remove the menu entry and uninstall the package (pipx or pip)."""
    if os.environ.get("OSINTCASE_DEB"):
        print("OSINT Case was installed from the .deb package. Remove it with:\n  sudo apt remove osintcase")
        return 0
    for item in remove():
        print("removed:", item)
    (DATA_DIR / ".shortcut-declined").unlink(missing_ok=True)  # a later reinstall may add the entry again
    in_pipx = "pipx" in Path(sys.prefix).as_posix().lower() and "venvs" in Path(sys.prefix).as_posix().lower()
    cmd = ["pipx", "uninstall", "osintcase"] if in_pipx and shutil.which("pipx") else [
        sys.executable, "-m", "pip", "uninstall", "-y", "osintcase"
    ]
    print("running:", " ".join(cmd))
    return subprocess.call(cmd)
