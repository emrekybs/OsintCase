"""Örnek dosyaları üretir.

1) example/operasyon-kara-sahin.case.json  — Türkçe, tamamen kurgusal askeri/terörle mücadele senaryosu
2) example/operation-nightjar-photos.case.json — İngilizce Nightjar örneği + fotoğraflar + yeni türler

Tüm kişiler, örgütler, numaralar ve adresler kurgusaldır. Fotoğraflar sentetik silüet /
sahne görselleridir (gerçek kişi yüzü yoktur). Telefonlar tahsis edilmemiş aralıklardan,
IP'ler belgeleme aralığından (203.0.113.0/24), alan adları .example uzantısındandır.
"""
import base64
import copy
import hashlib
import io
import json
import random
import uuid

from PIL import Image, ImageDraw, ImageFilter, ImageFont

import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
random.seed(731)


def uid():
    return str(uuid.uuid4())


def font(path, size):
    return ImageFont.truetype(path, size)


# ---------------------------------------------------------------- görseller
def hud(im, lines, color=(230, 230, 230), corner=(220, 40, 40)):
    """Gözetleme kamerası havası: köşe işaretleri + zaman damgası."""
    d = ImageDraw.Draw(im)
    w, h = im.size
    L = int(min(w, h) * 0.07)
    for (x, y, dx, dy) in [(12, 12, 1, 1), (w - 13, 12, -1, 1), (12, h - 13, 1, -1), (w - 13, h - 13, -1, -1)]:
        d.line([(x, y), (x + dx * L, y)], fill=corner, width=3)
        d.line([(x, y), (x, y + dy * L)], fill=corner, width=3)
    f = font(MONO, max(14, int(h * 0.028)))
    y = h - 18 - len(lines) * (f.size + 6)
    for ln in lines:
        d.rectangle([22, y - 2, 22 + d.textlength(ln, font=f) + 10, y + f.size + 3], fill=(0, 0, 0))
        d.text((27, y), ln, font=f, fill=color)
        y += f.size + 6
    return im


def grain(im, amount=14):
    px = im.load()
    w, h = im.size
    for _ in range(int(w * h * 0.06)):
        x, y = random.randrange(w), random.randrange(h)
        r, g, b = px[x, y]
        n = random.randint(-amount, amount)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return im


def portrait(bg1, bg2, skin, shirt, lines, w=600, h=760, nv=False):
    im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(bg1[i] * (1 - t) + bg2[i] * t) for i in range(3)))
    d.ellipse([w * 0.31, h * 0.15, w * 0.69, h * 0.50], fill=skin)
    d.rounded_rectangle([w * 0.44, h * 0.46, w * 0.56, h * 0.60], radius=10, fill=skin)
    d.rounded_rectangle([w * 0.12, h * 0.56, w * 0.88, h * 1.12], radius=130, fill=shirt)
    im = im.filter(ImageFilter.GaussianBlur(1.4))
    if nv:
        g = im.convert('L')
        im = Image.merge('RGB', (g.point(lambda v: v * 0.35), g.point(lambda v: min(255, v * 1.15 + 20)), g.point(lambda v: v * 0.35)))
    grain(im)
    return hud(im, lines)


def scene(sky, ground, lines, w=960, h=620, nv=False, vehicle=False):
    im = Image.new('RGB', (w, h), sky)
    d = ImageDraw.Draw(im)
    horizon = int(h * 0.55)
    d.rectangle([0, horizon, w, h], fill=ground)
    for _ in range(12):
        x = random.randint(-40, w)
        bw = random.randint(70, 210)
        bh = random.randint(80, 260)
        c = tuple(max(0, min(255, ground[j] + random.randint(-25, 35))) for j in range(3))
        d.rectangle([x, horizon - bh, x + bw, horizon + 10], fill=c)
        for wy in range(horizon - bh + 16, horizon - 10, 28):
            for wx in range(x + 12, x + bw - 12, 26):
                if random.random() < 0.25:
                    d.rectangle([wx, wy, wx + 9, wy + 12], fill=(210, 190, 120))
    if vehicle:
        vx, vy = int(w * 0.38), int(h * 0.66)
        d.rounded_rectangle([vx, vy, vx + 260, vy + 100], radius=12, fill=(215, 215, 210))
        d.rectangle([vx + 180, vy + 12, vx + 250, vy + 50], fill=(60, 70, 80))
        for cx in (vx + 50, vx + 205):
            d.ellipse([cx - 26, vy + 78, cx + 26, vy + 130], fill=(20, 20, 20))
        d.rectangle([vx + 90, vy + 70, vx + 170, vy + 90], fill=(240, 240, 240))
        d.text((vx + 96, vy + 71), '99 KV 731', font=font(MONO, 15), fill=(10, 10, 10))
    im = im.filter(ImageFilter.GaussianBlur(1.1))
    if nv:
        g = im.convert('L')
        im = Image.merge('RGB', (g.point(lambda v: v * 0.3), g.point(lambda v: min(255, v * 1.25 + 25)), g.point(lambda v: v * 0.3)))
    grain(im, 18)
    return hud(im, lines)


def doc_image(title, body, w=900, h=1180):
    im = Image.new('RGB', (w, h), (244, 242, 236))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, 70], fill=(160, 25, 25))
    d.text((30, 20), title, font=font(SANS, 28), fill=(255, 255, 255))
    y = 110
    f = font(MONO, 20)
    for ln in body:
        d.text((40, y), ln, font=f, fill=(30, 30, 30))
        y += 34
    d.text((40, h - 60), 'KURGUSAL ÖRNEK BELGE — GERÇEK DEĞİLDİR', font=font(SANS, 18), fill=(160, 25, 25))
    return grain(im, 8)


def enc(im, fmt='JPEG'):
    buf = io.BytesIO()
    im.save(buf, fmt, quality=84)
    raw = buf.getvalue()
    mime = 'image/jpeg' if fmt == 'JPEG' else 'image/png'
    return f'data:{mime};base64,' + base64.b64encode(raw).decode(), hashlib.sha256(raw).hexdigest(), len(raw), im.size


def photo(im, primary, caption='', source='', taken='', analyst='Analist K. Yılmaz'):
    url, h, n, (w, hh) = enc(im)
    return {
        'id': uid(), 'dataUrl': url, 'primary': primary, 'caption': caption, 'source': source, 'takenAt': taken,
        'fileName': f'img_{h[:8]}.jpg', 'mimeType': 'image/jpeg', 'size': n, 'width': w, 'height': hh,
        'sha256': h, 'addedAt': '2026-09-20T09:00:00.000Z', 'addedBy': analyst,
    }


# ---------------------------------------------------------------- yardımcılar
def ident(type_, fields, pos, rel=None, notes='', photos=None, ts='2026-07-10T09:00:00.000Z'):
    return {
        'id': uid(), 'type': type_, 'fields': fields, 'notes': notes,
        'position': {'x': pos[0], 'y': pos[1]}, 'customIconId': None, 'reliability': rel,
        'photos': photos or [], 'createdAt': ts, 'updatedAt': ts,
    }


def R(s, i, note='', at=''):
    return {'source': s, 'info': i, 'sourceNote': note, 'collectedAt': at}


def conn(a, b, label, conf='kesin', note='', sh='bottom', th='top'):
    return {'id': uid(), 'source': a['id'], 'target': b['id'], 'sourceHandle': sh, 'targetHandle': th,
            'label': label, 'confidence': conf, 'note': note}


def text_evidence(number, title, desc, fname, text, source, acquired, idents, pins, analyst, added):
    raw = text.encode('utf-8')
    return {
        'id': uid(), 'number': number, 'title': title, 'description': desc, 'fileName': fname,
        'mimeType': 'text/plain', 'size': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
        'dataUrl': 'data:text/plain;base64,' + base64.b64encode(raw).decode(), 'source': source,
        'acquiredAt': acquired, 'identifierIds': [i['id'] for i in idents], 'pinIds': [p['id'] for p in pins],
        'addedAt': added, 'addedBy': analyst,
        'custody': [{'id': uid(), 'ts': added, 'action': 'Teslim alındı', 'person': analyst, 'note': source}],
        'verifications': [{'id': uid(), 'ts': added.replace('09:', '17:'), 'ok': True}],
    }


def image_evidence(number, title, desc, im, source, acquired, idents, pins, analyst, added, fmt='JPEG'):
    url, h, n, _ = enc(im, fmt)
    return {
        'id': uid(), 'number': number, 'title': title, 'description': desc,
        'fileName': f'{number.lower()}.jpg', 'mimeType': 'image/jpeg', 'size': n, 'sha256': h, 'dataUrl': url,
        'source': source, 'acquiredAt': acquired, 'identifierIds': [i['id'] for i in idents],
        'pinIds': [p['id'] for p in pins], 'addedAt': added, 'addedBy': analyst,
        'custody': [
            {'id': uid(), 'ts': added, 'action': 'Teslim alındı', 'person': analyst, 'note': source},
            {'id': uid(), 'ts': added.replace('T09', 'T15'), 'action': 'Muhafazaya alındı', 'person': 'Delil sorumlusu (kurgusal)', 'note': 'Kilitli dolap D-3'},
        ],
        'verifications': [{'id': uid(), 'ts': added.replace('T09', 'T17'), 'ok': True}],
    }


# ================================================================ 1) KARA ŞAHİN
def kara_sahin():
    A = 'Analist K. Yılmaz'
    X, Y = 260, 170  # ızgara aralığı

    def P(c, r):
        return (40 + c * X, 40 + r * Y)

    serdar = ident('subject', {
        'fullName': 'Tarık Sönmezer', 'role': 'supheli', 'threat': 'kritik', 'aliases': 'SERDAR, T.S., "Hoca-7"',
        'dob': '1979-03-14', 'birthPlace': 'Kurgusal İl', 'nationality': 'Kurgusal Cumhuriyet',
        'idNumber': '00000000731', 'occupation': 'Örgüt bölge sorumlusu (değerlendirme)',
        'description': 'Yaklaşık 1,80 m, kır sakallı, sol kaşında dikiş izi. Gözlük kullanıyor.',
    }, P(2, 0), R('B', '2', 'Tutuklu itirafçı ifadesi İ-12, saha teyidi', '2026-07-02'),
        'Hücre yapılanmasının bölge sorumlusu olarak değerlendiriliyor. Kuryeler üzerinden haberleşiyor, sık telefon değiştiriyor.',
        [
            photo(portrait((70, 76, 84), (24, 26, 30), (58, 50, 46), (48, 52, 40), ['KAM-03  2026-07-18  22:41:07', 'HEDEF: SERDAR']), True, 'Gözetleme karesi — güvenli ev girişi', 'Saha ekibi Bravo', '2026-07-18'),
            photo(portrait((96, 90, 80), (40, 36, 30), (66, 56, 50), (90, 30, 30), ['ARŞİV  ESKİ KİMLİK FOTOĞRAFI', 'ÖRNEK']), True, 'Eski kimlik fotoğrafı (arşiv)', 'Arşiv kaydı (kurgusal)', '2014-05-02'),
            photo(scene((20, 24, 30), (34, 36, 40), ['KAM-03  2026-07-18  22:39:55', 'GÜVENLİ EV — KUZEY CEPHE'], nv=True), False, 'Güvenli ev, gece görüşlü kare', 'Saha ekibi Bravo', '2026-07-18'),
            photo(scene((120, 130, 140), (70, 74, 70), ['KAM-11  2026-07-22  06:12:30', 'PARAVAN DEPO — YÜKLEME'], vehicle=True), False, 'Paravan depoda yükleme', 'Sabit kamera KAM-11', '2026-07-22'),
        ])
    kasa = ident('subject', {
        'fullName': 'Selim Kaptanoğlu', 'role': 'supheli', 'threat': 'yuksek', 'aliases': 'KASA',
        'dob': '1985-11-02', 'birthPlace': 'Kurgusal İlçe', 'nationality': 'Kurgusal Cumhuriyet',
        'idNumber': '00000000418', 'occupation': 'Paravan şirket müdürü',
        'description': 'Orta boy, kısa saçlı, takım elbise giyiyor.',
    }, P(4, 0), R('B', '3', 'Mali analiz raporu MA-07'),
        'Örgütün finans hattını yönettiği değerlendiriliyor. Kripto cüzdanlar ve paravan şirket hesabı üzerinden para aktarıyor.',
        [photo(portrait((88, 92, 100), (30, 32, 38), (70, 60, 54), (30, 40, 70), ['KAM-11  2026-07-22  09:03:44', 'HEDEF: KASA']), True, 'Paravan şirket girişi', 'Sabit kamera KAM-11', '2026-07-22')])
    golge = ident('subject', {
        'fullName': 'Nazlı Erden', 'role': 'irtibat', 'threat': 'orta', 'aliases': 'GÖLGE',
        'dob': '1994-06-21', 'nationality': 'Kurgusal Cumhuriyet', 'idNumber': '00000000092',
        'occupation': 'Serbest grafik tasarımcı (propaganda içerikleri)',
    }, P(0, 0), R('C', '3', 'Açık kaynak — sosyal medya analizi'),
        'Propaganda kanalının içerik üreticisi olduğu değerlendiriliyor. Doğrudan eylem bağlantısı tespit edilmedi.',
        [photo(portrait((60, 64, 80), (22, 22, 30), (74, 62, 56), (70, 40, 80), ['AÇIK KAYNAK  PROFİL RESMİ', 'ÖRNEK']), True, 'Profil resmi (açık kaynak)', 'Instagram @kv.gonullu (kurgusal)', '2026-06-30')])
    tanik = ident('subject', {
        'fullName': 'Murat Çelen', 'role': 'tanik', 'threat': 'yok', 'occupation': 'Benzin istasyonu görevlisi',
    }, P(6, 0), R('B', '2', 'İfade tutanağı T-03'), 'Buluşma noktasını ve beyaz kamyoneti teşhis etti.')

    ozan = ident('acquaintance', {'name': 'Ozan Tekin', 'relation': 'okul-arkadasi', 'closeness': 'orta', 'metAt': 'Lise (kurgusal)', 'platform': 'Facebook arkadaşı', 'since': '1995’ten beri'},
                 P(1, 2), R('C', '3', 'Facebook arkadaş listesi'), '',
                 [photo(portrait((90, 96, 90), (30, 34, 30), (80, 66, 58), (40, 80, 60), ['AÇIK KAYNAK  PROFİL', 'ÖRNEK']), True, 'Facebook profil resmi')])
    anne = ident('family', {'name': 'Hatice Sönmezer', 'relation': 'anne', 'occupation': 'Ev hanımı'}, P(2, 2), R('B', '2', 'Nüfus kaydı (kurgusal)'))
    orgut = ident('organization', {'name': 'Kızıl Vadi Cephesi (KVC)', 'kind': 'Silahlı örgüt — kurgusal', 'country': 'Kurgusal bölge'}, P(3, 1), R('B', '2', 'İstihbarat özeti İÖ-2026/19'),
                  'Senaryo için uydurulmuş örgüttür. Gerçek bir yapıyla ilgisi yoktur.')
    paravan = ident('organization', {'name': 'Doğu Lojistik Ltd. Şti.', 'kind': 'Paravan şirket', 'registryNo': '0000-ÖRNEK-17', 'website': 'https://doglojistik.example'}, P(5, 1), R('B', '2', 'Ticaret sicili (kurgusal)'))
    kanal = ident('telegramChannel', {'handle': '@kizilvadi_duyuru', 'title': 'KV Duyuru', 'chatKind': 'kanal', 'members': '1840', 'admins': '@golge_tasarim', 'accountStatus': 'aktif', 'createdAt': '2025-11-04', 'archiveUrl': 'https://archive.example/kv-duyuru'},
                  P(0, 1), R('A', '2', 'Kanal arşivi, ekran görüntüleri D-004'))
    tg = ident('telegram', {'username': '@serdar_k', 'displayName': 'S.', 'accountStatus': 'aktif', 'lastSeen': '2026-07-29'}, P(1, 1), R('B', '3', 'Ele geçirilen telefon imajı'))
    wa = ident('whatsapp', {'phone': '+90 500 000 0731 (örnek)', 'displayName': 'Hoca', 'about': 'Sabır', 'accountKind': 'kisisel'}, P(2, 1), R('B', '2', 'HTS eşleşmesi (kurgusal)'))
    signal = ident('signal', {'phone': '+90 500 000 0418 (örnek)', 'username': 'kasa.07'}, P(4, 2), R('C', '3', 'Kaynak beyanı'))
    insta = ident('instagram', {'username': '@kv.gonullu', 'displayName': 'Gönüllü', 'followers': '3120', 'following': '41', 'posts': '188', 'accountStatus': 'askida', 'archiveUrl': 'https://archive.example/kv-gonullu'},
                  P(0, 2), R('A', '2', 'Arşivlenmiş profil'))
    github = ident('github', {'username': 'kv-media', 'profileUrl': 'https://github.example/kv-media', 'commitEmails': 'n.erden.design@posta.example', 'repos': '3', 'accountStatus': 'aktif'},
                   P(0, 3), R('B', '2', 'Commit geçmişi'))
    mail = ident('email', {'address': 'n.erden.design@posta.example', 'provider': 'Kurgusal Posta', 'context': 'Kişisel'}, P(1, 3), R('B', '2'))
    breach = ident('breach', {'breachName': 'OrnekForum 2022', 'breachDate': '2022-10-09', 'matched': 'n.erden.design@posta.example', 'exposedData': 'e-posta, kullanıcı adı, IP adresi', 'lookup': 'Sızıntı sorgu servisi (örnek)'},
                   P(2, 3), R('B', '2'))
    ip = ident('ip', {'ip': '203.0.113.77', 'asn': 'AS64500 Örnek Barındırma', 'geo': 'Kurgusal şehir', 'seenAt': '2026-07-21'}, P(3, 3), R('B', '2', 'Sızıntı kaydındaki son giriş IP’si'))
    domain = ident('domain', {'domain': 'kizilvadi.example', 'registrar': 'Örnek Kayıt Firması', 'registered': '2025-10-30', 'hosting': '203.0.113.77'}, P(3, 2), R('A', '1', 'WHOIS / DNS kaydı'))
    wallet = ident('wallet', {'address': 'TQ-ORNEK-KVC-0000-0000-0000-0731', 'chain': 'TRON (USDT)', 'exchange': 'Örnek Borsa'}, P(5, 2), R('B', '2', 'Zincir üstü analiz'))
    banka = ident('bankAccount', {'iban': 'TR00 0000 0000 0000 0000 0000 00', 'bank': 'Örnek Bankası', 'holder': 'Doğu Lojistik Ltd. Şti.'}, P(6, 1), R('A', '1', 'MASAK benzeri talep yanıtı (kurgusal)'))
    arac = ident('vehicle', {'description': '2017 model beyaz kamyonet', 'make': 'Örnek Marka', 'model': 'Panelvan', 'year': '2017', 'color': 'Beyaz', 'owner': 'Doğu Lojistik Ltd. Şti.'}, P(5, 3), R('A', '2', 'PTS kayıtları'),
                 '', [photo(scene((150, 160, 170), (80, 80, 76), ['PTS-04  2026-07-24  03:17:52', 'PLAKA: 99 KV 731'], vehicle=True), True, 'PTS kamerası', 'PTS-04 (kurgusal)', '2026-07-24')])
    plaka = ident('licensePlate', {'plate': '99 KV 731', 'region': 'Kurgusal il kodu', 'vehicleDescription': 'Beyaz kamyonet'}, P(6, 3), R('A', '1', 'PTS'))
    belge = ident('document', {'number': 'P-ÖRNEK-000731', 'docType': 'Pasaport (sahte olduğu değerlendiriliyor)', 'issuer': 'Kurgusal Cumhuriyet'}, P(3, 0), R('C', '4', 'Sınır kapısı kaydı (kurgusal)'))
    adres = ident('address', {'line1': 'Güvenli ev — Kuzey Mahallesi 7. Sokak (kurgusal)', 'city': 'Kurgusal İlçe', 'context': 'Güvenli ev'}, P(4, 3), R('B', '2', 'Fiziki takip'))

    idents = [serdar, kasa, golge, tanik, ozan, anne, orgut, paravan, kanal, tg, wa, signal, insta, github, mail, breach, ip, domain, wallet, banka, arac, plaka, belge, adres]
    LAYOUT = {'anne': (0, 0), 'ozan': (1, 0), 'tg': (2, 0), 'wa': (3, 0), 'belge': (4, 0), 'adres': (1, 1), 'serdar': (2, 1), 'orgut': (3, 1), 'signal': (4, 1), 'golge': (0, 2), 'kanal': (1, 2), 'domain': (2, 2), 'paravan': (3, 2), 'kasa': (4, 2), 'insta': (0, 3), 'github': (1, 3), 'ip': (2, 3), 'banka': (3, 3), 'wallet': (4, 3), 'mail': (1, 4), 'breach': (2, 4), 'arac': (3, 4), 'plaka': (4, 4), 'tanik': (3, 5)}
    for name, (c, r) in LAYOUT.items():
        locals()[name]['position'] = {'x': 40 + c * 270, 'y': 40 + r * 150}

    conns = [
        conn(serdar, orgut, 'Bölge sorumlusu', 'muhtemel', 'İtirafçı ifadesi + yazışmalar'),
        conn(kasa, orgut, 'Finans sorumlusu', 'muhtemel'),
        conn(golge, kanal, 'Kanal yöneticisi', 'kesin', 'Yönetici listesi'),
        conn(kanal, orgut, 'Propaganda yayını', 'kesin'),
        conn(serdar, tg, 'Kullanıyor', 'kesin', 'Ele geçirilen telefon'),
        conn(serdar, wa, 'Kullanıyor', 'muhtemel'),
        conn(kasa, signal, 'Kullanıyor', 'supheli', 'Kaynak beyanı, teyitsiz'),
        conn(kasa, paravan, 'Şirket müdürü', 'kesin'),
        conn(paravan, banka, 'Hesap sahibi', 'kesin'),
        conn(banka, wallet, 'Para aktarımı', 'muhtemel', '14 işlem, toplam ~42.000 USDT (örnek)'),
        conn(paravan, arac, 'Ruhsat sahibi', 'kesin'),
        conn(arac, plaka, 'Plaka', 'kesin'),
        conn(serdar, adres, 'İkamet / güvenli ev', 'muhtemel'),
        conn(serdar, belge, 'Sahte pasaport', 'supheli'),
        conn(serdar, ozan, 'Okul arkadaşı', 'muhtemel'),
        conn(serdar, anne, 'Anne', 'kesin'),
        conn(golge, insta, 'Hesap sahibi', 'muhtemel'),
        conn(golge, github, 'Hesap sahibi', 'muhtemel', 'Commit e-postası eşleşmesi'),
        conn(github, mail, 'Commit e-postası', 'kesin'),
        conn(mail, breach, 'Sızıntıda geçiyor', 'kesin'),
        conn(breach, ip, 'Son giriş IP', 'muhtemel'),
        conn(domain, ip, 'Barındırılıyor', 'kesin'),
        conn(kanal, domain, 'Bağlantı paylaşımı', 'kesin'),
        conn(tanik, arac, 'Teşhis etti', 'kesin', 'İfade T-03'),
        conn(serdar, kasa, 'Talimat veriyor', 'muhtemel', 'Kurye notları'),
    ]

    base_lat, base_lng = 39.842, 32.918

    def pin(label, addr, dlat, dlng, visited, withwho, notes, color, icon, radius, sightings=()):
        return {'id': uid(), 'label': label, 'address': addr, 'lat': round(base_lat + dlat, 6), 'lng': round(base_lng + dlng, 6),
                'placeId': None, 'visitedAt': visited, 'withWho': withwho, 'notes': notes, 'color': color, 'iconId': icon,
                'radius': radius, 'sightings': [{'id': uid(), 'date': s[0], 'time': s[1], 'note': s[2]} for s in sightings],
                'createdAt': '2026-07-05T09:00:00.000Z', 'updatedAt': '2026-07-30T09:00:00.000Z'}

    p_ev = pin('Güvenli ev', 'Kuzey Mahallesi 7. Sokak (kurgusal)', 0.004, -0.012, '2026-07-18 22:40', 'Tarık Sönmezer', 'Gece girişleri, perdeler sürekli kapalı.', 'red', 'home', 150,
               [('2026-07-18', '22:40', 'SERDAR giriş'), ('2026-07-21', '23:10', 'Kamyonet önünde bekledi'), ('2026-07-27', '01:05', 'İki kişi giriş')])
    p_depo = pin('Paravan depo', 'Sanayi Bölgesi 3. Cadde (kurgusal)', -0.011, 0.021, '2026-07-22 06:12', 'Selim Kaptanoğlu', 'Sabah erken yükleme.', 'orange', 'shopping', 300,
                 [('2026-07-22', '06:12', 'Yükleme — KAM-11'), ('2026-07-26', '05:48', 'Yükleme — KAM-11')])
    p_ist = pin('Buluşma noktası', 'Çevre yolu benzin istasyonu (kurgusal)', 0.019, 0.034, '2026-07-24 03:17', 'Murat Çelen (tanık)', 'Kurye el değişimi.', 'yellow', 'coffee', 100)
    p_sig = pin('Kırsal sığınak (şüpheli)', 'Batı sırtı, orman yolu (kurgusal)', 0.041, -0.052, '', '', 'İnsansız hava aracı görüntüsüyle tespit edildi, teyit bekleniyor.', 'purple', 'park', 600)
    pins = [p_ev, p_depo, p_ist, p_sig]

    def plink(p, i, ctx):
        return {'id': uid(), 'pinId': p['id'], 'identifierId': i['id'], 'context': ctx, 'createdAt': '2026-07-30T09:00:00.000Z'}

    pinLinks = [plink(p_ev, serdar, 'Kalıyor'), plink(p_ev, adres, 'Adres'), plink(p_depo, paravan, 'Şirket deposu'), plink(p_depo, kasa, 'Sabah girişleri'),
                plink(p_depo, arac, 'Park yeri'), plink(p_ist, arac, 'PTS kaydı'), plink(p_ist, tanik, 'İşyeri'), plink(p_sig, serdar, 'Şüpheli ziyaret')]

    ev1 = image_evidence('D-001', 'Güvenli ev gözetleme karesi', 'Gece görüşlü kamera karesi, SERDAR girişi.',
                         scene((20, 24, 30), (34, 36, 40), ['KAM-03  2026-07-18  22:40:12', 'D-001'], nv=True), 'Saha ekibi Bravo', '2026-07-18', [serdar], [p_ev], A, '2026-07-19T09:00:00.000Z')
    ev2 = image_evidence('D-002', 'PTS kaydı — 99 KV 731', 'Buluşma noktasında plaka tanıma kaydı.',
                         scene((150, 160, 170), (80, 80, 76), ['PTS-04  2026-07-24  03:17:52', 'D-002'], vehicle=True), 'PTS-04 (kurgusal)', '2026-07-24', [arac, plaka], [p_ist], A, '2026-07-24T09:00:00.000Z')
    ev3 = text_evidence('D-003', 'Tanık ifadesi T-03', 'Benzin istasyonu görevlisinin ifadesi.', 'ifade_T-03.txt',
                        'TANIK İFADESİ T-03 (KURGUSAL ÖRNEK)\nTanık: Murat Çelen\nTarih: 2026-07-24\n\nGece 03.15 sularında beyaz kamyonet (99 KV 731) pompa yanında durdu.\nSürücü bir çantayı bekleyen kişiye verdi. Fotoğraftaki kişiye benziyordu.\n',
                        'Görüşme odası 1', '2026-07-24', [tanik, arac, serdar], [p_ist], A, '2026-07-25T09:00:00.000Z')
    ev4 = image_evidence('D-004', 'Telegram kanal arşivi', 'Kanalın 2026-07-20 tarihli duyurusunun ekran görüntüsü.',
                         doc_image('@kizilvadi_duyuru — arşiv', ['2026-07-20 21:04', '', '"Yakında büyük duyuru."', '', 'Görüntülenme: 1.2B', 'İleten: 34', '', 'Bağlantı: kizilvadi.example/d/19']),
                         'Açık kaynak arşivi', '2026-07-20', [kanal, golge, domain], [], A, '2026-07-21T09:00:00.000Z')
    ev5 = text_evidence('D-005', 'Zincir üstü analiz özeti', 'Paravan şirket hesabından TRON cüzdanına aktarımlar.', 'zincir_analizi.txt',
                        'ZİNCİR ÜSTÜ ANALİZ (KURGUSAL ÖRNEK)\nCüzdan: TQ-ORNEK-KVC-0000-0000-0000-0731\n14 giriş işlemi, 2026-06-02 / 2026-07-28\nToplam ~42.000 USDT\n',
                        'Mali analiz birimi (kurgusal)', '2026-07-29', [wallet, banka, kasa], [], A, '2026-07-29T09:00:00.000Z')
    evidence = [ev1, ev2, ev3, ev4, ev5]

    def event(date, time, title, desc, cat, ids, pins_=(), evs=(), rel=None):
        return {'id': uid(), 'date': date, 'time': time, 'title': title, 'description': desc, 'category': cat,
                'identifierIds': [i['id'] for i in ids], 'pinIds': [p['id'] for p in pins_], 'evidenceIds': [e['id'] for e in evs],
                'reliability': rel, 'createdAt': f'{date}T09:00:00.000Z', 'updatedAt': f'{date}T09:00:00.000Z'}

    events = [
        event('2025-10-30', '', 'kizilvadi.example alan adı kaydedildi', 'Propaganda sitesi için.', 'dijital', [domain], rel={'source': 'A', 'info': '1'}),
        event('2025-11-04', '', 'Telegram duyuru kanalı açıldı', '', 'dijital', [kanal, golge], rel={'source': 'A', 'info': '2'}),
        event('2026-06-02', '14:20', 'İlk USDT aktarımı', 'Paravan şirket hesabından borsaya.', 'finans', [banka, wallet, kasa], evs=[ev5], rel={'source': 'B', 'info': '2'}),
        event('2026-07-18', '22:40', 'SERDAR güvenli eve giriş yaptı', 'Gece görüşlü kamera ile tespit.', 'gorulme', [serdar], [p_ev], [ev1], {'source': 'A', 'info': '2'}),
        event('2026-07-20', '21:04', '"Yakında büyük duyuru" paylaşımı', 'Kanal etkileşimi 3 katına çıktı.', 'iletisim', [kanal], evs=[ev4], rel={'source': 'A', 'info': '2'}),
        event('2026-07-24', '03:17', 'Buluşma noktasında el değişimi', 'Kamyonet sürücüsü çanta teslim etti.', 'operasyon', [arac, serdar, tanik], [p_ist], [ev2, ev3], {'source': 'B', 'info': '2'}),
        event('2026-07-28', '10:00', 'Fiziki takip yoğunlaştırıldı', 'İki ekip, 7/24.', 'operasyon', [serdar, kasa], rel={'source': 'A', 'info': '1'}),
    ]

    log_actions = [
        ('2026-07-01T08:00:00.000Z', 'Dosya oluşturuldu', 'Operasyon Kara Şahin'),
        ('2026-07-02T10:00:00.000Z', 'Tanımlayıcı eklendi', 'Şahıs: Tarık Sönmezer'),
        ('2026-07-19T09:00:00.000Z', 'Delil eklendi', 'D-001 Güvenli ev gözetleme karesi'),
        ('2026-07-24T09:00:00.000Z', 'Delil eklendi', 'D-002 PTS kaydı — 99 KV 731'),
        ('2026-07-25T09:00:00.000Z', 'Delil eklendi', 'D-003 Tanık ifadesi T-03'),
        ('2026-07-29T09:00:00.000Z', 'Künye güncellendi', 'öncelik: kritik'),
    ]
    audit = [{'id': uid(), 'ts': ts, 'analyst': A, 'action': a, 'detail': dt} for ts, a, dt in log_actions]

    return {
        'schemaVersion': 2, 'id': uid(), 'name': 'Operasyon Kara Şahin',
        'createdAt': '2026-07-01T08:00:00.000Z', 'updatedAt': '2026-09-27T09:00:00.000Z',
        'classification': 'cok-gizli',
        'caseInfo': {
            'caseNumber': '2026/TER-0731', 'investigator': A, 'unit': 'Terörle Mücadele — OSINT Analiz Masası (kurgusal)',
            'status': 'aktif', 'priority': 'kritik', 'openedAt': '2026-07-01',
            'legalBasis': 'Görevlendirme emri GE-2026/044 (örnek)',
            'summary': 'Kurgusal Kızıl Vadi Cephesi (KVC) örgütünün bölge hücresine yönelik açık kaynak ve saha destekli analiz. '
                       'Odak: bölge sorumlusu SERDAR kod adlı şahıs, finans hattı (paravan şirket → kripto cüzdan), '
                       'propaganda kanalı ve lojistik araç.\n\nBu dosyadaki tüm kişi, örgüt, numara ve yerler kurgusal örnek verilerdir.',
            'assessment': 'SERDAR’ın hücrenin bölge sorumlusu olduğu ve güvenli ev ile paravan depo arasında lojistik '
                          'koordinasyon yürüttüğü kuvvetle muhtemeldir. KASA kod adlı şahsın finans hattını yönettiği muhtemeldir. '
                          'Propaganda kanalındaki "büyük duyuru" paylaşımı ile 24 Temmuz el değişimi arasındaki zamansal yakınlık '
                          'dikkat çekicidir. Kırsal sığınağın İHA ile teyidi ve TRON cüzdanı için borsa talep yazısı önerilir.',
            'assessmentConfidence': 'orta',
        },
        'target': {'name': 'Tarık Sönmezer (SERDAR)', 'notes': 'Doğrudan temastan kaçınılmalı. Karşı takip yapıyor, sık araç ve telefon değiştiriyor.'},
        'identifiers': idents, 'connections': conns, 'locations': pins, 'pinLinks': pinLinks,
        'events': events, 'evidence': evidence, 'auditLog': audit,
        'mapDisplay': {'showPinConnections': True, 'pinConnectionColor': '#ef4444', 'showRadius': True, 'showDensity': True},
    }


# ================================================================ 2) NIGHTJAR + PHOTOS (EN)
def nightjar():
    d = json.load(open(f'{ROOT}/example/operation-nightjar.case.json'))
    d = copy.deepcopy(d)
    A = 'Analyst J. Doe'
    subs = [i for i in d['identifiers'] if i['type'] == 'subject']
    looks = [((90, 96, 110), (30, 32, 40), (60, 50, 46), (120, 30, 30)),
             ((110, 100, 90), (40, 34, 30), (74, 62, 56), (40, 70, 110)),
             ((80, 100, 90), (28, 36, 32), (66, 56, 50), (70, 70, 70))]
    for k, s in enumerate(subs):
        b1, b2, skin, shirt = looks[k % 3]
        name = s['fields']['fullName'].upper()
        s['photos'] = [photo(portrait(b1, b2, skin, shirt, [f'CAM-0{k + 1}  2026-08-1{k + 1}  23:4{k}:12', f'SUBJECT: {name}']), True, 'Surveillance still', 'Surveillance team 3', f'2026-08-1{k + 1}', A)]
    hale = subs[0]
    hale['photos'].append(photo(portrait((120, 110, 100), (50, 40, 30), (70, 60, 54), (30, 30, 30), ['ARCHIVE  PASSPORT PHOTO', 'SAMPLE']), True, 'Archived passport photo', 'Border record (fictional)', '2019-03-02', A))
    hale['photos'].append(photo(scene((50, 60, 70), (90, 90, 100), ['CAM-07  2026-08-12  23:41:03', 'WAREHOUSE ENTRANCE']), False, 'Warehouse entrance', 'Surveillance team 3', '2026-08-12', A))
    hale['photos'].append(photo(scene((20, 24, 30), (40, 40, 44), ['CAM-07  2026-08-15  00:12:47', 'NIGHT LOADING'], nv=True), False, 'Night loading', 'CCTV (fictional)', '2026-08-15', A))

    new = [
        ident('acquaintance', {'name': 'Viktor Lanz', 'relation': 'yakin-arkadas', 'closeness': 'guclu', 'metAt': 'Harbour sailing club', 'platform': 'Instagram follower'}, (40, 820),
              R('C', '3', 'Instagram following list'), '', [photo(portrait((60, 70, 90), (20, 20, 30), (72, 60, 54), (90, 90, 40), ['OPEN SOURCE  PROFILE', 'SAMPLE']), True, 'Profile picture', '', '', A)]),
        ident('github', {'username': 'nj-ops', 'profileUrl': 'https://github.example/nj-ops', 'commitEmails': 'm.hale@harborline.example', 'repos': '4', 'accountStatus': 'aktif'}, (330, 820), R('B', '2', 'Commit history')),
        ident('whatsapp', {'phone': '+1 555 0142 773', 'displayName': 'M.', 'about': 'Busy', 'accountKind': 'kisisel'}, (620, 820), R('B', '3')),
        ident('breach', {'breachName': 'ExampleShop 2023', 'breachDate': '2023-04-02', 'matched': 'm.hale@harborline.example', 'exposedData': 'e-mail, password hash, phone', 'lookup': 'Breach lookup service (sample)'}, (910, 820), R('A', '2')),
        ident('family', {'name': 'Anna Hale', 'relation': 'kardes', 'occupation': 'Teacher'}, (1200, 820)),
    ]
    d['identifiers'] += new
    d['connections'] += [conn(hale, new[0], 'Close friend', 'muhtemel'), conn(hale, new[1], 'Account owner', 'muhtemel'),
                         conn(hale, new[2], 'Uses'), conn(new[1], new[3], 'Appears in breach', 'supheli'), conn(hale, new[4], 'Sister')]
    d['caseInfo']['assessmentConfidence'] = 'orta'
    return d


if __name__ == '__main__':
    ks = kara_sahin()
    json.dump(ks, open(f'{ROOT}/example/operasyon-kara-sahin.case.json', 'w'), ensure_ascii=False, indent=1)
    nj = nightjar()
    json.dump(nj, open(f'{ROOT}/example/operation-nightjar-photos.case.json', 'w'), ensure_ascii=False, indent=1)
    import os
    for f in ['operasyon-kara-sahin.case.json', 'operation-nightjar-photos.case.json']:
        print(f, os.path.getsize(f'{ROOT}/example/{f}') // 1024, 'KB')
