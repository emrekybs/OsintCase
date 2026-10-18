#!/usr/bin/env python3
"""Replaces the portrait placeholders in the sample cases with the photos in tools/sample-photos/.

A = hooded figure (used for suspects / contacts), B = scarf and sunglasses (used for a witness and a friend).
Scene and vehicle stills are left as they are. SHA-256, size and dimensions are recomputed.
Needs Pillow.  Usage: python3 tools/apply-sample-photos.py
"""
import base64, hashlib, io, json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PH = ROOT / 'tools' / 'sample-photos'
A = Image.open(PH / 'subject-a.png').convert('RGB')
B = Image.open(PH / 'subject-b.png').convert('RGB')


def variant(src, kind):
    im = src
    if kind == 'crop':
        im = src.crop((120, 140, 920, 1240))
    elif kind == 'gray':
        im = src.convert('L').convert('RGB')
    elif kind == 'graycrop':
        im = src.crop((60, 80, 960, 1300)).convert('L').convert('RGB')
    im = im.resize((520, round(520 * im.height / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=82, optimize=True)
    return buf.getvalue(), im.size


# (file, name key) -> list of (image, variant) for each portrait slot in order
PLAN = {
    'operasyon-kara-sahin.case.json': {
        'Tarık Sönmezer': [(A, 'full'), (A, 'graycrop')],
        'Selim Kaptanoğlu': [(A, 'crop')],
        'Nazlı Erden': [(A, 'gray')],
        'Ozan Tekin': [(B, 'crop')],
    },
    'operation-nightjar-photos.case.json': {
        'Marcus Hale': [(A, 'full'), (A, 'graycrop')],
        'Elena Kovac': [(A, 'crop')],
        'Daniel Ortiz': [(B, 'full')],
        'Viktor Lanz': [(B, 'crop')],
    },
}

for fname, people in PLAN.items():
    path = ROOT / 'example' / fname
    data = json.loads(path.read_text(encoding='utf-8'))
    for ident in data['identifiers']:
        f = ident.get('fields') or {}
        name = f.get('fullName') or f.get('name')
        if name not in people:
            continue
        slots = list(people[name])
        for ph in ident.get('photos', []):
            if ph['height'] < ph['width'] or not slots:   # keep landscape scene stills
                continue
            src, kind = slots.pop(0)
            raw, (w, h) = variant(src, kind)
            digest = hashlib.sha256(raw).hexdigest()
            ph.update({
                'dataUrl': 'data:image/jpeg;base64,' + base64.b64encode(raw).decode(),
                'fileName': f'img_{digest[:8]}.jpg', 'mimeType': 'image/jpeg',
                'size': len(raw), 'width': w, 'height': h, 'sha256': digest,
            })
        print(fname, name, 'ok')
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
