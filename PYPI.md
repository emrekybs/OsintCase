# OSINT Case

Investigation case workspace for profiling subjects, taking notes, mapping links and writing up
the case. It does **not** run tools or scrape anything; it organises what you collected elsewhere.
Everything runs locally. Turkish and English interface and reports.

## Install (Linux, macOS, Windows)

```bash
pipx install osintcase
osintcase                     # opens the app in its own window
osintcase --web               # opens it in your browser instead
```

Use **pipx** where possible. Recent Debian, Ubuntu, Fedora and Arch refuse a plain `pip install`
into the system Python ("externally-managed-environment"); pipx avoids that.

| Distribution | Get pipx | Window dependency |
|---|---|---|
| Debian / Ubuntu / Mint | `sudo apt install pipx` | `sudo apt install libxcb-cursor0` |
| Fedora | `sudo dnf install pipx` | `sudo dnf install xcb-util-cursor` |
| Arch / Manjaro | `sudo pacman -S python-pipx` | `sudo pacman -S xcb-util-cursor` |
| openSUSE | `sudo zypper install python3-pipx` | `sudo zypper install libxcb-cursor0` |

Then run `pipx ensurepath` once and open a new terminal. If a window cannot be opened,
OSINT Case falls back to your browser. Requires Python 3.9+ (glibc-based Linux; Alpine is not supported).

* The application menu entry and logo icon are added on first start (`--install-shortcut` does it by hand)
* `osintcase --uninstall` removes the menu entry and the package
* The server listens on `127.0.0.1` only; no telemetry

## What it does

* Case files, evidence hashing (SHA-256), Admiralty grading, audit log, optional AES-256-GCM encryption
* Link network, map, timeline, report (PDF / single-file HTML)
* Three fictional sample cases on the home screen (Turkish and English)

Licensed under GPL-3.0. Source: https://github.com/emrekybs/OsintCase
