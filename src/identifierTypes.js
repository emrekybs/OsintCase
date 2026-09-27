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
import {
  ACCOUNT_STATUSES,
  ACQUAINTANCE_RELATIONS,
  CLOSENESS,
  FAMILY_RELATIONS,
  MESSENGER_KINDS,
  SUBJECT_ROLES,
  TG_CHAT_KINDS,
  THREAT_LEVELS,
} from './caseModel.js';
import { localizeRegistry } from './i18n/index.jsx';

/*
 * Ek alan özellikleri:
 *   - section:   aynı section değerini taşıyan alanlar formda bir alt başlık
 *                altında toplanır (ör. "Hesap bilgileri").
 *   - sensitive: raporda "karartma" açıkken değer siyah bantla gizlenir.
 */

export const CATEGORIES = {
  personal: { label: 'Kişi', order: 1 },
  social: { label: 'Sosyal Medya', order: 2 },
  contact: { label: 'İletişim', order: 3 },
  digital: { label: 'Dijital / Teknik', order: 4 },
  finance: { label: 'Finans', order: 5 },
  vehicle: { label: 'Araç', order: 6 },
  other: { label: 'Diğer', order: 7 },
};

const ACCOUNT = 'Hesap bilgileri';

const socialNumericFields = () => [
  { key: 'followers', label: 'Takipçi', type: 'number' },
  { key: 'following', label: 'Takip edilen', type: 'number' },
  { key: 'posts', label: 'Gönderi', type: 'number' },
];

/**
 * Tüm sosyal medya hesaplarında ortak alanlar. Kullanıcı adı değişebilir;
 * sayısal ID ve arşiv bağlantısı hesabın izini korur.
 */
const accountMeta = ({ withId = true, idLabel = 'Sayısal kullanıcı ID' } = {}) => [
  ...(withId
    ? [{ key: 'userId', label: idLabel, type: 'text', section: ACCOUNT, placeholder: 'Kullanıcı adı değişse de sabit kalır' }]
    : []),
  { key: 'accountStatus', label: 'Hesap durumu', type: 'select', options: ACCOUNT_STATUSES, section: ACCOUNT },
  { key: 'createdAt', label: 'Hesap açılış tarihi', type: 'date', section: ACCOUNT },
  { key: 'lastSeen', label: 'Son etkinlik', type: 'date', section: ACCOUNT },
  { key: 'archiveUrl', label: 'Arşiv bağlantısı', type: 'url', section: ACCOUNT, placeholder: 'web.archive.org / archive.today' },
];

/** Basit profil: kullanıcı adı + URL + görünen ad + sayılar + biyografi. */
const simpleProfile = ({ usernamePlaceholder = '@kullanici', numeric = socialNumericFields(), extra = [], meta = {} } = {}) => [
  { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true, placeholder: usernamePlaceholder },
  { key: 'profileUrl', label: 'Profil URL', type: 'url' },
  { key: 'displayName', label: 'Görünen ad', type: 'text' },
  ...extra,
  ...numeric,
  { key: 'bio', label: 'Biyografi', type: 'textarea' },
  ...accountMeta(meta),
];

export const IDENTIFIER_TYPES = {
  // ---- Kişi ------------------------------------------------------------------
  subject: {
    label: 'Şahıs',
    category: 'personal',
    glyph: 'S',
    color: '#d32f2f',
    fields: [
      { key: 'fullName', label: 'Ad soyad', type: 'text', primary: true },
      { key: 'role', label: 'Dosyadaki rolü', type: 'select', options: SUBJECT_ROLES },
      { key: 'threat', label: 'Tehdit seviyesi', type: 'select', options: THREAT_LEVELS },
      { key: 'aliases', label: 'Kod adı / takma adlar', type: 'text' },
      { key: 'dob', label: 'Doğum tarihi', type: 'date' },
      { key: 'birthPlace', label: 'Doğum yeri', type: 'text' },
      { key: 'nationality', label: 'Uyruk', type: 'text' },
      { key: 'idNumber', label: 'Kimlik / pasaport no', type: 'text', sensitive: true },
      { key: 'occupation', label: 'Meslek / görev', type: 'text' },
      { key: 'description', label: 'Eşkal / tarif', type: 'textarea' },
    ],
  },
  name: {
    label: 'İsim',
    category: 'personal',
    glyph: 'N',
    color: '#3B82F6',
    fields: [
      { key: 'fullName', label: 'Ad soyad', type: 'text', primary: true },
      { key: 'aliases', label: 'Takma adlar', type: 'text' },
      { key: 'dob', label: 'Doğum tarihi', type: 'date' },
      { key: 'gender', label: 'Cinsiyet', type: 'text' },
    ],
  },
  acquaintance: {
    label: 'Tanıdık / arkadaş',
    category: 'personal',
    glyph: 'TN',
    color: '#7C3AED',
    fields: [
      { key: 'name', label: 'Ad soyad', type: 'text', primary: true },
      { key: 'relation', label: 'İlişki türü', type: 'select', options: ACQUAINTANCE_RELATIONS },
      { key: 'closeness', label: 'Yakınlık derecesi', type: 'select', options: CLOSENESS },
      { key: 'metAt', label: 'Nereden tanışıyor', type: 'text', placeholder: 'Okul, iş yeri, mahalle, spor salonu…' },
      { key: 'platform', label: 'Bağlantılı olduğu platform', type: 'text', placeholder: 'Instagram takipçisi, Facebook arkadaşı…' },
      { key: 'since', label: 'Ne zamandan beri', type: 'text', placeholder: 'ör. 2019’dan beri' },
      { key: 'occupation', label: 'Meslek', type: 'text' },
      { key: 'contact', label: 'İletişim', type: 'text' },
    ],
  },
  family: {
    label: 'Aile üyesi',
    category: 'personal',
    glyph: 'FM',
    color: '#F59E0B',
    fields: [
      { key: 'name', label: 'Ad', type: 'text', primary: true },
      { key: 'relation', label: 'Yakınlık', type: 'select', options: FAMILY_RELATIONS },
      { key: 'dob', label: 'Doğum tarihi', type: 'date' },
      { key: 'occupation', label: 'Meslek', type: 'text' },
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
  employment: {
    label: 'İş geçmişi',
    category: 'personal',
    glyph: 'İŞ',
    color: '#0369A1',
    fields: [
      { key: 'company', label: 'Kurum / şirket', type: 'text', primary: true },
      { key: 'position', label: 'Pozisyon', type: 'text' },
      { key: 'location', label: 'Konum', type: 'text' },
      { key: 'start', label: 'Başlangıç', type: 'text', placeholder: 'ör. 03.2019' },
      { key: 'end', label: 'Bitiş', type: 'text', placeholder: 'ör. 2023 ya da “devam ediyor”' },
      { key: 'source', label: 'Bilginin geçtiği yer', type: 'text', placeholder: 'LinkedIn, şirket sitesi, haber…' },
    ],
  },
  education: {
    label: 'Eğitim',
    category: 'personal',
    glyph: 'EĞ',
    color: '#4D7C0F',
    fields: [
      { key: 'school', label: 'Okul / kurum', type: 'text', primary: true },
      { key: 'department', label: 'Bölüm / alan', type: 'text' },
      { key: 'degree', label: 'Derece', type: 'text', placeholder: 'Lise, ön lisans, lisans, yüksek lisans…' },
      { key: 'years', label: 'Yıllar', type: 'text', placeholder: 'ör. 2012–2016' },
      { key: 'city', label: 'Şehir', type: 'text' },
    ],
  },
  organization: {
    label: 'Kuruluş / örgüt',
    category: 'personal',
    glyph: 'OR',
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
    glyph: 'ID',
    color: '#0F766E',
    fields: [
      { key: 'number', label: 'Belge no', type: 'text', primary: true, sensitive: true },
      { key: 'docType', label: 'Belge türü', type: 'text', placeholder: 'Pasaport, kimlik, ehliyet…' },
      { key: 'issuer', label: 'Veren makam / ülke', type: 'text' },
      { key: 'validUntil', label: 'Geçerlilik', type: 'date' },
    ],
  },

  // ---- Sosyal medya -------------------------------------------------------------
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
      ...socialNumericFields(),
      { key: 'videos', label: 'Video', type: 'number' },
      { key: 'taggedPhotos', label: 'Etiketli fotoğraf', type: 'number' },
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
      ...accountMeta(),
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
      { key: 'friends', label: 'Arkadaş sayısı', type: 'number' },
      ...socialNumericFields(),
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
      ...accountMeta(),
    ],
  },
  twitter: {
    label: 'X / Twitter',
    category: 'social',
    glyph: 'X',
    color: '#1d1d1f',
    fields: simpleProfile(),
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
      ...accountMeta({ idLabel: 'Kanal ID' }),
    ],
  },
  tiktok: {
    label: 'TikTok',
    category: 'social',
    glyph: 'TT',
    color: '#000000',
    fields: simpleProfile({ extra: [], numeric: [...socialNumericFields(), { key: 'likes', label: 'Beğeni', type: 'number' }] }),
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
      ...accountMeta({ withId: false }),
    ],
  },
  whatsapp: {
    label: 'WhatsApp',
    category: 'social',
    glyph: 'WA',
    color: '#25D366',
    fields: [
      { key: 'phone', label: 'Telefon numarası', type: 'tel', primary: true, placeholder: '+90 5xx xxx xx xx' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      { key: 'about', label: 'Hakkında / durum metni', type: 'text' },
      { key: 'accountKind', label: 'Hesap türü', type: 'select', options: MESSENGER_KINDS },
      { key: 'businessInfo', label: 'İşletme bilgisi', type: 'textarea', placeholder: 'Adres, kategori, web sitesi, çalışma saatleri…' },
      { key: 'groups', label: 'Ortak / bilinen gruplar', type: 'textarea' },
      ...accountMeta({ withId: false }),
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
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
      ...accountMeta(),
    ],
  },
  telegramChannel: {
    label: 'Telegram kanal / grup',
    category: 'social',
    glyph: 'TK',
    color: '#26A5E4',
    fields: [
      { key: 'handle', label: 'Kanal / grup adı', type: 'text', primary: true, placeholder: '@kanal' },
      { key: 'title', label: 'Başlık', type: 'text' },
      { key: 'chatKind', label: 'Türü', type: 'select', options: TG_CHAT_KINDS },
      { key: 'inviteLink', label: 'Davet bağlantısı', type: 'url', placeholder: 'https://t.me/+…' },
      { key: 'members', label: 'Üye / abone', type: 'number' },
      { key: 'admins', label: 'Yöneticiler', type: 'text' },
      { key: 'description', label: 'Açıklama', type: 'textarea' },
      ...accountMeta({ idLabel: 'Kanal / grup ID' }),
    ],
  },
  signal: {
    label: 'Signal',
    category: 'social',
    glyph: 'SG',
    color: '#3B45FD',
    fields: [
      { key: 'phone', label: 'Telefon numarası', type: 'tel', primary: true, placeholder: '+90 5xx xxx xx xx' },
      { key: 'username', label: 'Signal kullanıcı adı', type: 'text', placeholder: 'ad.01' },
      { key: 'displayName', label: 'Profil adı', type: 'text' },
      { key: 'about', label: 'Hakkında', type: 'text' },
      ...accountMeta({ withId: false }),
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
      ...accountMeta({ withId: false }),
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
      { key: 'servers', label: 'Bilinen sunucular', type: 'textarea' },
      ...accountMeta({ withId: false }),
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
      { key: 'subreddits', label: 'Aktif olduğu topluluklar', type: 'textarea' },
      ...accountMeta({ withId: false }),
    ],
  },
  github: {
    label: 'GitHub',
    category: 'social',
    glyph: 'GH',
    color: '#24292F',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true },
      { key: 'profileUrl', label: 'Profil URL', type: 'url', placeholder: 'https://github.com/…' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      { key: 'commitEmails', label: 'Commit e-postaları', type: 'textarea', placeholder: 'Commit / .patch çıktılarında görünen adresler' },
      { key: 'company', label: 'Şirket', type: 'text' },
      { key: 'location', label: 'Konum', type: 'text' },
      { key: 'website', label: 'Web sitesi / blog', type: 'url' },
      { key: 'repos', label: 'Açık repo', type: 'number' },
      { key: 'followers', label: 'Takipçi', type: 'number' },
      { key: 'following', label: 'Takip edilen', type: 'number' },
      { key: 'keys', label: 'SSH / GPG anahtar parmak izleri', type: 'textarea' },
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
      ...accountMeta(),
    ],
  },
  gitlab: {
    label: 'GitLab',
    category: 'social',
    glyph: 'GL',
    color: '#FC6D26',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      { key: 'commitEmails', label: 'Commit e-postaları', type: 'textarea' },
      { key: 'location', label: 'Konum', type: 'text' },
      { key: 'projects', label: 'Proje sayısı', type: 'number' },
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
      ...accountMeta(),
    ],
  },
  google: {
    label: 'Google hesabı',
    category: 'social',
    glyph: 'G',
    color: '#4285F4',
    fields: [
      { key: 'email', label: 'Gmail / Google hesabı', type: 'email', primary: true, placeholder: 'ad@gmail.com' },
      { key: 'gaiaId', label: 'GAIA ID', type: 'text' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      { key: 'mapsProfile', label: 'Maps katkı profili', type: 'url' },
      { key: 'mapsReviews', label: 'Maps yorum sayısı', type: 'number' },
      { key: 'services', label: 'Kullandığı servisler', type: 'text', placeholder: 'YouTube, Maps, Takvim, Fotoğraflar…' },
      ...accountMeta({ withId: false }),
    ],
  },
  threads: {
    label: 'Threads',
    category: 'social',
    glyph: 'TH',
    color: '#101010',
    fields: simpleProfile(),
  },
  bluesky: {
    label: 'Bluesky',
    category: 'social',
    glyph: 'BS',
    color: '#1185FE',
    fields: [
      { key: 'handle', label: 'Handle', type: 'text', primary: true, placeholder: 'ad.bsky.social' },
      { key: 'did', label: 'DID', type: 'text', placeholder: 'did:plc:…' },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      ...socialNumericFields(),
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
      ...accountMeta({ withId: false }),
    ],
  },
  mastodon: {
    label: 'Mastodon',
    category: 'social',
    glyph: 'MA',
    color: '#6364FF',
    fields: [
      { key: 'username', label: 'Kullanıcı adı', type: 'text', primary: true, placeholder: '@ad@sunucu.social' },
      { key: 'instance', label: 'Sunucu', type: 'text', placeholder: 'mastodon.social' },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'displayName', label: 'Görünen ad', type: 'text' },
      ...socialNumericFields(),
      { key: 'bio', label: 'Biyografi', type: 'textarea' },
      ...accountMeta(),
    ],
  },
  vk: {
    label: 'VK',
    category: 'social',
    glyph: 'VK',
    color: '#0077FF',
    fields: simpleProfile({
      usernamePlaceholder: 'kısa ad ya da id…',
      extra: [{ key: 'city', label: 'Şehir', type: 'text' }],
      numeric: [
        { key: 'friends', label: 'Arkadaş sayısı', type: 'number' },
        { key: 'followers', label: 'Takipçi', type: 'number' },
      ],
    }),
  },
  pinterest: {
    label: 'Pinterest',
    category: 'social',
    glyph: 'PI',
    color: '#BD081C',
    fields: simpleProfile({
      numeric: [
        { key: 'followers', label: 'Takipçi', type: 'number' },
        { key: 'following', label: 'Takip edilen', type: 'number' },
        { key: 'pins', label: 'Pin sayısı', type: 'number' },
      ],
    }),
  },
  twitch: {
    label: 'Twitch',
    category: 'social',
    glyph: 'TW',
    color: '#9146FF',
    fields: simpleProfile({
      usernamePlaceholder: 'kanal adı',
      numeric: [{ key: 'followers', label: 'Takipçi', type: 'number' }],
    }),
  },
  kick: {
    label: 'Kick',
    category: 'social',
    glyph: 'KI',
    color: '#0B0B0B',
    fields: simpleProfile({
      usernamePlaceholder: 'kanal adı',
      numeric: [{ key: 'followers', label: 'Takipçi', type: 'number' }],
      meta: { withId: false },
    }),
  },
  steam: {
    label: 'Steam',
    category: 'social',
    glyph: 'ST',
    color: '#1B2838',
    fields: [
      { key: 'username', label: 'Profil adı / özel URL', type: 'text', primary: true },
      { key: 'steamId', label: 'SteamID64', type: 'text', placeholder: '7656119…' },
      { key: 'profileUrl', label: 'Profil URL', type: 'url' },
      { key: 'realName', label: 'Profildeki gerçek ad', type: 'text' },
      { key: 'country', label: 'Ülke', type: 'text' },
      { key: 'level', label: 'Seviye', type: 'number' },
      { key: 'friends', label: 'Arkadaş sayısı', type: 'number' },
      { key: 'nameHistory', label: 'Eski profil adları', type: 'textarea' },
      ...accountMeta({ withId: false }),
    ],
  },
  spotify: {
    label: 'Spotify',
    category: 'social',
    glyph: 'SP',
    color: '#1ED760',
    fields: simpleProfile({
      usernamePlaceholder: 'kullanıcı adı / id',
      numeric: [
        { key: 'followers', label: 'Takipçi', type: 'number' },
        { key: 'playlists', label: 'Çalma listesi', type: 'number' },
      ],
      meta: { withId: false },
    }),
  },
  medium: {
    label: 'Medium',
    category: 'social',
    glyph: 'ME',
    color: '#111111',
    fields: simpleProfile({
      numeric: [{ key: 'followers', label: 'Takipçi', type: 'number' }],
      meta: { withId: false },
    }),
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
      ...accountMeta({ withId: false }),
    ],
  },

  // ---- İletişim -----------------------------------------------------------------
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
      { key: 'imei', label: 'IMEI', type: 'text', sensitive: true },
      { key: 'country', label: 'Ülke', type: 'text' },
    ],
  },

  // ---- Dijital ------------------------------------------------------------------
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
    glyph: 'DV',
    color: '#334155',
    fields: [
      { key: 'model', label: 'Marka / model', type: 'text', primary: true },
      { key: 'serial', label: 'Seri no', type: 'text', sensitive: true },
      { key: 'imei', label: 'IMEI', type: 'text', sensitive: true },
      { key: 'mac', label: 'MAC adresi', type: 'text' },
    ],
  },
  breach: {
    label: 'Sızıntı kaydı',
    category: 'digital',
    glyph: 'SZ',
    color: '#9F1239',
    fields: [
      { key: 'breachName', label: 'Sızıntı / veri ihlali', type: 'text', primary: true, placeholder: 'ör. Örnek Site 2021' },
      { key: 'breachDate', label: 'İhlal tarihi', type: 'date' },
      { key: 'matched', label: 'Eşleşen tanımlayıcı', type: 'text', placeholder: 'e-posta, telefon, kullanıcı adı…' },
      { key: 'exposedData', label: 'Açığa çıkan veri türleri', type: 'text', placeholder: 'e-posta, parola özeti, telefon, adres…' },
      { key: 'lookup', label: 'Sorgulanan servis', type: 'text', placeholder: 'ör. Have I Been Pwned' },
      { key: 'summary', label: 'Kayıt özeti', type: 'textarea', placeholder: 'Parolaları düz metin olarak yazmayın.', sensitive: true },
    ],
  },

  // ---- Finans -------------------------------------------------------------------
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
      { key: 'iban', label: 'IBAN / hesap no', type: 'text', primary: true, sensitive: true },
      { key: 'bank', label: 'Banka', type: 'text' },
      { key: 'holder', label: 'Hesap sahibi', type: 'text' },
    ],
  },

  // ---- Araç ---------------------------------------------------------------------
  vehicle: {
    label: 'Araç',
    category: 'vehicle',
    glyph: 'VH',
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
    glyph: 'LP',
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

/** Kişi türleri: fotoğraf alanı bunlarda formun üstünde açık gelir, "Şahsa dönüştür" bunlarda çıkar. */
export const PERSON_TYPES = new Set(['subject', 'name', 'acquaintance', 'family']);

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

localizeRegistry(IDENTIFIER_TYPES, CATEGORIES);
