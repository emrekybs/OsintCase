# OSINT Case

<p align="center">
  <img src="docs/osintcase.png" alt="OSINT Case" width="260">
</p>

<p align="center">
  A local investigation workspace: profile subjects, map the links between them, build one timeline,<br>
  keep the evidence, and export the case as a report. Turkish and English. No server, no telemetry.
</p>

OSINT Case does not run tools or query platforms. It is where findings you collected elsewhere are
organised, graded, linked and written up.

![Link network](docs/screenshots/network.png)

## What it does

**Map the links.** Every subject, organisation, account and place becomes a node. Connect them as
confirmed, probable or doubtful, find the shortest path between two nodes, see who is central, and
export the graph as PNG or SVG.

**Profile each subject.** 50+ identifier types: personal data, acquaintances, employment, education,
25+ platforms, breach records, notes and photos, each with a reliability grade.

![Subject profile](docs/screenshots/subject.png)

**One timeline.** Events, visits, sightings and exhibits from all subjects merge into a single
chronological view.

![Timeline](docs/screenshots/timeline.png)

**Evidence vault.** Files and screenshots are attached to the case with source, date and hash, with an
audit log of every change.

![Evidence](docs/screenshots/evidence.png)

**Locations.** Pin addresses and sightings on OpenStreetMap (no key needed) or Google Maps.

**Reports.** Cover, summary, profiles, network, locations, timeline, exhibits and grading key, as
PDF or a single HTML file. Optional redaction and watermark.

![Report](docs/screenshots/report.png)

Light and dark themes, adjustable font size, optional encryption of case files.

![Dark theme](docs/screenshots/network-dark.png)

## Install

```bash
pipx install osintcase        # or: pip install osintcase
osintcase                     # opens the app in its own window
osintcase --web               # opens it in your browser instead
```

Run from source (Node.js 18+):

```bash
npm install
npm run dev
```

## Sample cases

The home screen lists three fictional cases to explore. The files are in [`example/`](example) and
exported reports in [`example/example-reports`](example/example-reports).

| Case | Language |
|---|---|
| `operasyon-kara-sahin.case.json` | TR |
| `operation-nightjar-photos.case.json` | EN |
| `operation-nightjar.case.json` | EN |

## Privacy

Everything runs on your machine. Case data and evidence stay on the local device. Use it only for
authorised investigations.

## Licence

[GPL-3.0](LICENSE)
