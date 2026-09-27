/**
 * Örnek dosyaları web sitesine hazırlar (npm run dev / build öncesi çalışır).
 *
 *   example/samples.meta.json  →  public/samples/index.json
 *   example/<dosya>.case.json  →  public/samples/<id>.case.json
 *   ana hedefin ana fotoğrafı  →  public/samples/<id>.jpg (kart görseli)
 *
 * public/samples/ üretilen bir klasördür, git'e girmez.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exDir = path.join(root, 'example');
const outDir = path.join(root, 'public', 'samples');
const meta = JSON.parse(fs.readFileSync(path.join(exDir, 'samples.meta.json'), 'utf8'));

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const index = [];
for (const m of meta) {
  const src = path.join(exDir, m.file);
  if (!fs.existsSync(src)) {
    console.warn(`[samples] eksik: ${m.file}`);
    continue;
  }
  const raw = fs.readFileSync(src, 'utf8');
  const c = JSON.parse(raw);
  fs.writeFileSync(path.join(outDir, `${m.id}.case.json`), raw);

  const idents = c.identifiers ?? [];
  const subjects = idents.filter((i) => i.type === 'subject');
  const tn = (c.target?.name ?? '').toLowerCase();
  const target =
    subjects.find((s) => {
      const n = (s.fields?.fullName ?? '').toLowerCase();
      return n && tn.includes(n);
    }) ?? subjects[0];
  const photo = target?.photos?.find((p) => p.primary) ?? target?.photos?.[0];
  let cover = null;
  const mm = photo?.dataUrl?.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  if (mm) {
    const ext = mm[1] === 'jpeg' ? 'jpg' : mm[1];
    cover = `${m.id}.${ext}`;
    fs.writeFileSync(path.join(outDir, cover), Buffer.from(mm[2], 'base64'));
  }

  index.push({
    id: m.id,
    file: `${m.id}.case.json`,
    lang: m.lang,
    title: m.title,
    desc: m.desc,
    cover,
    caseNumber: c.caseInfo?.caseNumber ?? '',
    classification: c.classification ?? '',
    size: Buffer.byteLength(raw),
    stats: {
      subjects: subjects.length,
      identifiers: idents.length,
      links: (c.connections ?? []).length,
      locations: (c.locations ?? []).length,
      events: (c.events ?? []).length,
      evidence: (c.evidence ?? []).length,
      photos: idents.reduce((n, i) => n + (i.photos?.length ?? 0), 0),
    },
  });
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
console.log(`[samples] ${index.length} örnek hazırlandı → public/samples/`);
