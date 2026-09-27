/**
 * Intro page (/). No framework: screen tabs and sample case cards.
 * Fonts are bundled with the site (no third-party font requests).
 */
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './site.css';

const TABS = {
  subject: {
    title: 'SUBJECTS & PHOTOS',
    cap: 'Several main and additional photos per person — drag & drop or paste with Ctrl+V. A SHA-256 hash of every original is kept.',
  },
  timeline: {
    title: 'TIMELINE',
    cap: 'Events, location visits, sightings and exhibits merged into one month-by-month timeline.',
  },
  evidence: {
    title: 'EVIDENCE VAULT',
    cap: 'Exhibit number, SHA-256 hash, re-verification and chain of custody for every item.',
  },
  report: {
    title: 'REPORT BUILDER',
    cap: 'Pick theme, sections, redaction and watermark — then save as PDF or a single-file HTML report.',
  },
  home: {
    title: 'CASE DESK',
    cap: 'Start a new case, open a file from disk, pick up where you left off, or explore a sample case.',
  },
};

function setTab(key) {
  const tab = TABS[key];
  if (!tab) return;
  document.querySelectorAll('.tabs button').forEach((b) => {
    const on = b.dataset.tab === key;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.getElementById('tab-img').src = `/site/shots/en-${key}.webp`;
  document.getElementById('tab-title').textContent = tab.title;
  document.getElementById('tab-cap').textContent = tab.cap;
}

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

// Warm the other tab images so switching is instant.
window.addEventListener('load', () => {
  Object.keys(TABS).forEach((k) => {
    const im = new Image();
    im.src = `/site/shots/en-${k}.webp`;
  });
});

/* ---- Sample cases ---------------------------------------------------------- */

const CLS = {
  'tasnif-disi': ['UNCLASSIFIED', '#2f7d46', '#fff'],
  'hizmete-ozel': ['RESTRICTED', '#2b5f9e', '#fff'],
  ozel: ['CONFIDENTIAL', '#6b3fa0', '#fff'],
  gizli: ['SECRET', '#b3261e', '#fff'],
  'cok-gizli': ['TOP SECRET', '#d96b00', '#111'],
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function renderSamples(list) {
  const box = document.getElementById('sample-list');
  if (!box || !list.length) return;
  // English case first.
  const sorted = [...list].sort((a, b) => (a.lang === 'en' ? -1 : 0) - (b.lang === 'en' ? -1 : 0));
  box.innerHTML = sorted
    .map((s) => {
      const [label, bg, fg] = CLS[s.classification] ?? ['', '#444', '#fff'];
      const st = s.stats ?? {};
      const data = s.lang === 'tr' ? '<span class="sample-note mono">Case data in Turkish</span>' : '';
      return `<a class="sample" href="/app/?sample=${encodeURIComponent(s.id)}">
  <span class="sample-img">
    ${s.cover ? `<img src="/samples/${esc(s.cover)}" alt="" loading="lazy">` : ''}
    ${label ? `<span class="sample-cls mono" style="background:${bg};color:${fg}">${label}</span>` : ''}
  </span>
  <span class="sample-body">
    <span class="sample-no mono">${esc(s.caseNumber)}</span>
    <b>${esc(s.title?.en ?? s.id)}</b>
    <span class="sample-desc">${esc(s.desc?.en ?? '')}</span>
    <span class="sample-stats mono">
      <span><b>${st.subjects ?? 0}</b> subjects</span>
      <span><b>${st.identifiers ?? 0}</b> identifiers</span>
      <span><b>${st.photos ?? 0}</b> photos</span>
      <span><b>${st.evidence ?? 0}</b> exhibits</span>
    </span>
    <span class="sample-go mono">Open case →</span>
    ${data}
  </span>
</a>`;
    })
    .join('');
}

fetch('/samples/index.json')
  .then((r) => (r.ok ? r.json() : []))
  .then((j) => renderSamples(Array.isArray(j) ? j : []))
  .catch(() => {});
