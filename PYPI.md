# OSINT Case

<p align="center"><img src="https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/osintcase.png" alt="OSINT Case" width="240"></p>

A local investigation workspace: profile subjects, map links, build a timeline, keep evidence,
export a report. No server, no telemetry.

## Install (Linux, macOS, Windows)

```bash
pipx install osintcase        # or: pip install osintcase
osintcase                     # opens the app in its own window
osintcase --web               # opens it in your browser
```

Recent Debian, Ubuntu, Fedora and Arch refuse a plain `pip install` into the system Python;
use pipx there.

| Distribution | Get pipx | Window dependency |
|---|---|---|
| Debian / Ubuntu / Mint | `sudo apt install pipx` | `sudo apt install libxcb-cursor0` |
| Fedora | `sudo dnf install pipx` | `sudo dnf install xcb-util-cursor` |
| Arch / Manjaro | `sudo pacman -S python-pipx` | `sudo pacman -S xcb-util-cursor` |
| openSUSE | `sudo zypper install python3-pipx` | `sudo zypper install libxcb-cursor0` |

Then run `pipx ensurepath` once and open a new terminal. Requires Python 3.9+.

## What it does

Link network, map, subject profiles, timeline, evidence vault and reports (PDF or single-file HTML).

### Light

| Link network | Map |
|---|---|
| ![Network](https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/screenshots/network.png) | ![Map](https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/screenshots/map.png) |

| Subject profile | Report |
|---|---|
| ![Subject](https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/screenshots/subject.png) | ![Report](https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/screenshots/report.png) |

### Dark

| Link network | Timeline |
|---|---|
| ![Network](https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/screenshots/network-dark.png) | ![Timeline](https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/screenshots/timeline-dark.png) |

| Evidence | Report |
|---|---|
| ![Evidence](https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/screenshots/evidence-dark.png) | ![Report](https://raw.githubusercontent.com/emrekybs/OsintCase/main/docs/screenshots/report-dark.png) |

Three fictional sample cases are on the home screen.

Licensed under GPL-3.0. Source: https://github.com/emrekybs/OsintCase
