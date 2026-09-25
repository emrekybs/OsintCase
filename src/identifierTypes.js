/**
 * Yerleşik tanımlayıcı türleri ve "özel" genel tür.
 *
 * Her tür şunları tanımlar:
 *   - label:    seçicide ve rozetlerde görünen ad
 *   - category: seçicide gruplama (bkz. CATEGORIES)
 *   - glyph:    renkli rozette gösterilen 1-2 karakter
 *   - color:    rozet arka planı
 *   - fields:   form alanları
 *
 * Alan tanımı:
 *   - key:         identifier.fields içindeki anahtar (DEĞİŞTİRMEYİN — eski
 *                  dosyalarla uyumluluk bu anahtarlara bağlı)
 *   - label:       form etiketi
 *   - type:        'text' | 'textarea' | 'url' | 'email' | 'tel' | 'number' |
 *                  'date' | 'select'
 *   - options:     select için [{ key, label }]
 *   - placeholder: isteğe bağlı
 *   - primary:     true ise liste etiketi olarak kullanılır ve zorunludur
 */
import { SUBJECT_ROLES, THREAT_LEVELS } from './caseModel.js';

export const CATEGORIES = {
  personal: { label: 'Kişi', order: 1 },
  social: { label: 'Sosyal Medya', order: 2 },
  contact: { label: 'İletişim', order: 3 },
  digital: { label: 'Dijital / Teknik', order: 4 },
  finance: { label: 'Finans', order: 5 },
  vehicle: { label: 'Araç', order: 6 },
  other: { label: 'Diğer', order: 7 },
};

const socialNumericFields = [
  { key: 'followers', label: 'Takipçi', type: 'number' },
  { key: 'following', label: 'Takip edilen', type: 'number' },
  { key: 'posts', label: 'Gönderi', type: 'number' },
];

export const IDENTIFIER_TYPES = {
  subject: {
    label: 'Şahıs',
    category: 'personal',
    glyph: 'ŞH',
    color: '#8c9a4f',
    fields: [
      { key: 'fullName', label: 'Ad soyad', type: 'text', primary: true },
      { key: 'role', label: 'Dosyadaki rolü', type: 'select', options: SUBJECT_ROLES },
      { key: 'threat', label: 'Tehdit seviyesi', type: 'select', options: THREAT_LEVELS },
      { key: 'aliases', label: 'Kod adı / takma adlar', type: 'text' },
      { key: 'dob', label: 'Doğum tarihi', type: 'date' },
      { key: 'birthPlace', label: 'Doğum yeri', type: 'text' },
      { key: 'nationality', label: 'Uyruk', type: 'text' },
      { key: 'idNumber', label: 'Kimlik / pasaport no', type: 'text' },
      { key: 'occupation', label: 'Meslek / görev', type: 'text' },
      { key: 'description', label: 'Eşkal / tarif', type: 'textarea' },
    ],
  },
  name: {
    label: 'İsim',
    category: 'personal',
    glyph: 'İS',
    color: '#3B82F6',
    fields: [
      { key: 'fullName', label: 'Ad soyad', type: 'text', primary: true },
      { key: 'aliases', label: 'Takma adlar', type: 'text' },
      { key: 'dob', label: 'Doğum tarihi', type: 'date' },
      { key: 'gender', label: 'Cinsiyet', type: 'text' },
    ],
  },
  family: {
    label: 'Aile üyesi',
    category: 'personal',
    glyph: 'AÜ',
    color: '#F59E0B',
    fields: [
      { key: 'name', label: 'Ad', type: 'text', primary: true },
      { key: 'relation', label: 'Yakınlık', type: 'text', placeholder: 'Eş, anne, kardeş…' },
      { key: 'dob', label: 'Doğum tarihi', type: 'date' },
      { key: 'contact', label: 'İletişim', type: 'text' },
    ],
  },
  address: {
    label: 'Adres',
    category: 'personal',
    glyph: 'AD',
    color: '#10B981',
    fields: [
      { key: 'line1', label: 'Adres', type: 'text', primary: true },
      { key: 'line2', label: 'Daire / kapı no', type: 'text' },
      { key: 'city', label: 'İlçe / şehir', type: 'text' },
      { key: 'region', label: 'İl / bölge', type: 'text' },
      { key: 'postal', label: 'Posta kodu', type: 'text' },
      { key: 'country', label: 'Ülke', type: 'text' },
      { key: 'context', label: 'Niteliği', type: 'text', placeholder: 'İkamet, iş yeri, eski adres…' },
    ],
  },
  organization: {
    label: 'Kuruluş / örgüt',
    category: 'personal',
    glyph: 'KR',
    color: '#64748B',
    fields: [
      { key: 'name', label: 'Ad', type: 'text', primary: true },
      { key: 'kind', label: 'Türü', type: 'text', placeholder: 'Şirket, dernek, grup…' },
      { key: 'registryNo', label: 'Sicil / vergi no', type: 'text' },
      { key: 'country', label: 'Ülke', type: 'text' },
      { key: 'website', label: 'Web sitesi', type: 'url' },
    ],
  },
  document: {
    label: 'Kimlik belgesi',
    category: 'personal',
    glyph: 'KB',
    color: '#0F766E',
    fields: [
      { key: 'number', label: 'Belge no', type: 'text', primary: true },
      { key: 'docType', label: 'Belge türü', type: 'text', placeholder: 'Pasaport, kimlik, ehliyet…' },
      { key: 'issuer', label: 'Veren makam / ülke', type: 'text' },
      { key: 'validUntil', label: 'Geçerlilik', type: 'date' },
    ],
  },

  instagram: {
    label: 'Instagram',
    category: 'social',
    glyph: 'IG',
    color: '#E1306C',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true, placeholder: '@kullanici' },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      { key: 'email', label: 'Bağlı e-posta', type: 'email' },
      { key: 'phone', label: 'Bağlı telefon', type: 'tel' },
      ...socialNumericFields,
      { key: 'videos', label: 'Video', type: 'number' },
      { key: 'taggedPhotos', label: 'Etiketli fotoğraf', type: 'number' },
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
    ],
  },
  facebook: {
    label: 'Facebook',
    category: 'social',
    glyph: 'FB',
    color: '#1877F2',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      { key: 'email', label: 'Bağlı e-posta', type: 'email' },
      ...socialNumericFields,
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
    ],
  },
  twitter: {
    label: 'X / Twitter',
    category: 'social',
    glyph: 'X',
    color: '#1d1d1f',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true, placeholder: '@kullanici' },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      ...socialNumericFields,
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
    ],
  },
  youtube: {
    label: 'YouTube',
    category: 'social',
    glyph: 'YT',
    color: '#FF0000',
    fields: [
      { key: 'channelName', label: 'Kanal adı', type: 'text', primary: true },
      { key: 'channelUrl', label: 'Kanal URL', type: 'url' },
      { key: 'handle', label: 'Kullanıcı adı', type: 'text', placeholder: '@kanal' },
      { key: 'subscribers', label: 'Abone', type: 'number' },
      { key: 'videos', label: 'Video', type: 'number' },
      { key: 'bio', label: 'Hakkında', type: 'textarea' },
    ],
  },
  tiktok: {
    label: 'TikTok',
    category: 'social',
    glyph: 'TT',
    color: '#000000',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true, placeholder: '@kullanici' },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      ...socialNumericFields,
      { key: 'likes', label: 'Beğeni', type: 'number' },
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
    ],
  },
  linkedin: {
    label: 'LinkedIn',
    category: 'social',
    glyph: 'LI',
    color: '#0A66C2',
    fields: [
      { key: 'fullName', label: 'Ad soyad', type: 'text', primary: true },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'headline', label: 'Başlık', type: 'text' },
      { key: 'company', label: 'Şirket', type: 'text' },
      { key: 'role', label: 'Pozisyon', type: 'text' },
      { key: 'location', label: 'Konum', type: 'text' },
      { key: 'connections', label: 'Bağlantı sayısı', type: 'number' },
    ],
  },
  snapchat: {
    label: 'Snapchat',
    category: 'social',
    glyph: 'SC',
    color: '#FFFC00',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      { key: 'snapcode', label: 'Snapcode URL', type: 'url' },
    ],
  },
  reddit: {
    label: 'Reddit',
    category: 'social',
    glyph: 'RD',
    color: '#FF4500',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true, placeholder: 'u/kullanici' },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'karma', label: 'Karma', type: 'number' },
      { key: 'accountAge', label: 'Hesap yaşı', type: 'text', placeholder: 'ör. 4 yıl' },
    ],
  },
  discord: {
    label: 'Discord',
    category: 'social',
    glyph: 'DC',
    color: '#5865F2',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      { key: 'userId', label: 'Kullanıcı ID', type: 'text' },
    ],
  },
  telegram: {
    label: 'Telegram',
    category: 'social',
    glyph: 'TG',
    color: '#2AABEE',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true, placeholder: '@kullanici' },
      { key: 'phone', label: 'Bağlı telefon', type: 'tel' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
    ],
  },
  username: {
    label: 'Kullanıcı adı (genel)',
    category: 'social',
    glyph: '@U',
    color: '#475569',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true },
      { key: 'platform', label: 'Platform / forum', type: 'text' },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
    ],
  },

  email: {
    label: 'E-posta',
    category: 'contact',
    glyph: '@',
    color: '#7C4DFF',
    fields: [
      { key: 'address', label: 'E-posta adresi', type: 'email', primary: true, placeholder: 'ad@ornek.com' },
      { key: 'provider', label: 'Sağlayıcı', type: 'text', placeholder: 'Gmail, Outlook, ProtonMail…' },
      { key: 'context', label: 'Kullanım', type: 'text', placeholder: 'İş, kişisel, tek kullanımlık…' },
    ],
  },
  phone: {
    label: 'Telefon',
    category: 'contact',
    glyph: '☎',
    color: '#0EA5A0',
    fields: [
      { key: 'number', label: 'Telefon numarası', type: 'tel', primary: true, placeholder: '+90 5xx xxx xx xx' },
      { key: 'carrier', label: 'Operatör', type: 'text' },
      { key: 'lineType', label: 'Hat türü', type: 'text', placeholder: 'Mobil, sabit, VoIP…' },
      { key: 'imei', label: 'IMEI', type: 'text' },
      { key: 'country', label: 'Ülke', type: 'text' },
    ],
  },

  ip: {
    label: 'IP adresi',
    category: 'digital',
    glyph: 'IP',
    color: '#2563EB',
    fields: [
      { key: 'ip', label: 'IP adresi', type: 'text', primary: true, placeholder: '203.0.113.7' },
      { key: 'asn', label: 'ASN / sağlayıcı', type: 'text' },
      { key: 'geo', label: 'Konum bilgisi', type: 'text' },
      { key: 'seenAt', label: 'Görüldüğü tarih', type: 'date' },
    ],
  },
  domain: {
    label: 'Alan adı',
    category: 'digital',
    glyph: 'DN',
    color: '#1D4ED8',
    fields: [
      { key: 'domain', label: 'Alan adı', type: 'text', primary: true, placeholder: 'ornek.com' },
      { key: 'registrar', label: 'Kayıt firması', type: 'text' },
      { key: 'registered', label: 'Kayıt tarihi', type: 'date' },
      { key: 'hosting', label: 'Barındırma / IP', type: 'text' },
    ],
  },
  device: {
    label: 'Cihaz',
    category: 'digital',
    glyph: 'CH',
    color: '#334155',
    fields: [
      { key: 'model', label: 'Marka / model', type: 'text', primary: true },
      { key: 'serial', label: 'Seri no', type: 'text' },
      { key: 'imei', label: 'IMEI', type: 'text' },
      { key: 'mac', label: 'MAC adresi', type: 'text' },
    ],
  },

  wallet: {
    label: 'Kripto cüzdan',
    category: 'finance',
    glyph: '₿',
    color: '#B45309',
    fields: [
      { key: 'address', label: 'Cüzdan adresi', type: 'text', primary: true },
      { key: 'chain', label: 'Ağ', type: 'text', placeholder: 'BTC, ETH, TRON…' },
      { key: 'exchange', label: 'Borsa / servis', type: 'text' },
    ],
  },
  bankAccount: {
    label: 'Banka hesabı',
    category: 'finance',
    glyph: '₺',
    color: '#15803D',
    fields: [
      { key: 'iban', label: 'IBAN / hesap no', type: 'text', primary: true },
      { key: 'bank', label: 'Banka', type: 'text' },
      { key: 'holder', label: 'Hesap sahibi', type: 'text' },
    ],
  },

  vehicle: {
    label: 'Araç',
    category: 'vehicle',
    glyph: 'AR',
    color: '#EF4444',
    fields: [
      { key: 'description', label: 'Tarif', type: 'text', primary: true, placeholder: '2018 Renault Clio, gri' },
      { key: 'make', label: 'Marka', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'year', label: 'Yıl', type: 'number' },
      { key: 'color', label: 'Renk', type: 'text' },
      { key: 'owner', label: 'Ruhsat sahibi', type: 'text' },
    ],
  },
  vin: {
    label: 'Şasi no (VIN)',
    category: 'vehicle',
    glyph: 'VN',
    color: '#DC2626',
    fields: [
      { key: 'vin', label: 'Şasi no', type: 'text', primary: true, placeholder: '17 karakter' },
      { key: 'vehicleDescription', label: 'Araç tarifi', type: 'text' },
    ],
  },
  licensePlate: {
    label: 'Plaka',
    category: 'vehicle',
    glyph: 'PL',
    color: '#B91C1C',
    fields: [
      { key: 'plate', label: 'Plaka', type: 'text', primary: true },
      { key: 'region', label: 'İl / bölge', type: 'text' },
      { key: 'country', label: 'Ülke', type: 'text' },
      { key: 'vehicleDescription', label: 'Araç tarifi', type: 'text' },
    ],
  },

  custom: {
    label: 'Özel',
    category: 'other',
    glyph: '*',
    color: '#6B7280',
    fields: [
      { key: 'title', label: 'Başlık', type: 'text', primary: true, placeholder: 'Bu tanımlayıcı nedir?' },
      { key: 'value', label: 'Değer', type: 'text' },
      { key: 'url', label: 'URL', type: 'url' },
    ],
  },
};

export function listTypesByCategory() {
  const byCat = {};
  for (const [key, def] of Object.entries(IDENTIFIER_TYPES)) {
    if (!byCat[def.category]) byCat[def.category] = [];
    byCat[def.category].push({ key, ...def });
  }
  return Object.entries(CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => ({
      key,
      label: meta.label,
      types: byCat[key] ?? [],
    }))
    .filter((c) => c.types.length > 0);
}

export function getTypeDef(typeKey) {
  return IDENTIFIER_TYPES[typeKey] ?? IDENTIFIER_TYPES.custom;
}

export function getPrimaryFieldKey(typeKey) {
  const def = getTypeDef(typeKey);
  return def.fields.find((f) => f.primary)?.key ?? def.fields[0]?.key;
}

/** Bir alan değerini okunur metne çevirir (select için etiket). */
export function formatFieldValue(field, value) {
  if (value == null || value === '') return '';
  if (field?.type === 'select') {
    return field.options?.find((o) => o.key === value)?.label ?? String(value);
  }
  return String(value);
}

export function getDisplayLabel(identifier) {
  if (!identifier) return '';
  const primaryKey = getPrimaryFieldKey(identifier.type);
  const value = identifier.fields?.[primaryKey];
  if (value && String(value).trim()) return String(value);
  return getTypeDef(identifier.type).label;
}

export function getSecondaryLabel(identifier) {
  if (!identifier) return '';
  const def = getTypeDef(identifier.type);
  const primaryKey = getPrimaryFieldKey(identifier.type);
  for (const field of def.fields) {
    if (field.key === primaryKey) continue;
    // Şahıs için rol/tehdit ayrı rozetlerle gösteriliyor.
    if (identifier.type === 'subject' && field.type === 'select') continue;
    const value = identifier.fields?.[field.key];
    if (value && String(value).trim()) return formatFieldValue(field, value);
  }
  return '';
}

/**
 * Hangi görselin (varsa) kullanılacağını çözer.
 *
 * Sıra:
 *   1. Tanımlayıcıdaki customIconId (tür varsayılanını ezer)
 *   2. Tür varsayılanı (TYPE_DEFAULT_ICON)
 *   3. null → çağıran renkli harf rozeti çizer
 */
export function resolveIconSrc(
  { typeKey, customIconId },
  customIcons = {},
  BUILT_IN_ICONS,
  TYPE_DEFAULT_ICON,
  getBuiltInSrc,
  theme = 'dark',
) {
  if (customIconId) {
    if (BUILT_IN_ICONS[customIconId]) return getBuiltInSrc(customIconId, theme);
    if (customIcons[customIconId]) return customIcons[customIconId].dataUrl;
  }
  const fallback = TYPE_DEFAULT_ICON[typeKey];
  if (fallback && BUILT_IN_ICONS[fallback]) return getBuiltInSrc(fallback, theme);
  return null;
}
