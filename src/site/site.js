/**
 * Tanıtım sayfası (/). React kullanmaz; dil, sekmeler ve örnek kartları.
 * Dil seçimi uygulamayla aynı anahtarda saklanır, /app/'e geçince korunur.
 */
import './site.css';

const LANG_KEY = 'osint-tool:lang';

const T = {
  tr: {
    band: 'OSINT CASE · SORUŞTURMA VE İSTİHBARAT ANALİZ MASASI',
    'nav.screens': 'Ekranlar',
    'nav.features': 'Özellikler',
    'nav.report': 'Rapor',
    'nav.samples': 'Örnekler',
    'nav.privacy': 'Gizlilik',
    'cta.start': 'Soruşturmaya başla',
    'cta.sample': 'Örnek dosyayı aç',
    'hero.kicker': 'AÇIK KAYNAK · SUNUCUSUZ · KAYIT GEREKTİRMEZ',
    'hero.title': 'Dağınık izleri tek bir soruşturma dosyasında birleştirin.',
    'hero.lead': 'Şahıslar, hesaplar, konumlar, deliller ve kronoloji aynı masada. Bağlantı ağını görün, kaynakları değerlendirin, raporu tek tıkla PDF ya da HTML olarak alın. Veriler tarayıcınızdan çıkmaz.',
    's1.t': 'Dosyayı aç',
    's1.d': 'Dosya no, gizlilik derecesi, hedef ve hukuki dayanakla künyeyi oluşturun. Her sayfada gizlilik bandı görünür.',
    's2.t': 'Topla ve bağla',
    's2.d': "50'den fazla tanımlayıcı türü, kişi fotoğrafları, konumlar ve deliller. Sürükleyip bağlayın, kaynağı Admiralty koduyla derecelendirin.",
    's3.t': 'Raporla',
    's3.d': 'Kapak, şahıs profilleri, ağ şeması, kronoloji ve delil listesiyle rapor. Koyu ya da açık tema, karartma ve filigran.',
    'scr.kicker': 'EKRANLAR',
    'scr.title': 'Bir soruşturmanın tamamı, tek pencerede',
    'tab.network': 'Bağlantı ağı',
    'tab.subject': 'Şahıs ve fotoğraflar',
    'tab.timeline': 'Kronoloji',
    'tab.evidence': 'Delil kasası',
    'tab.report': 'Rapor',
    'cap.network': 'Şahıslar, hesaplar, örgütler, araçlar ve para akışı tek ağda. Ana fotoğraflar düğümlerde avatar olarak görünür.',
    'cap.subject': 'Birden fazla ana ve diğer fotoğraf; sürükle-bırak ya da Ctrl+V ile yapıştır. Her görselin SHA-256 özeti saklanır.',
    'cap.timeline': 'Olaylar, ziyaretler, görülmeler ve deliller ay ay tek zaman çizelgesinde.',
    'cap.evidence': 'Delil numarası, SHA-256 özeti, yeniden doğrulama ve teslim zinciri.',
    'cap.report': 'Rapor önizlemesi: tema, bölümler, karartma ve filigran seçimi; PDF ya da tek dosya HTML çıktısı.',
    'feat.kicker': 'ÖZELLİKLER',
    'feat.title': 'Soruşturma masasında olması gereken her şey',
    'f1.t': 'Bağlantı ağı',
    'f1.d': 'Sürükle-bağla düğümler, kesin / muhtemel / şüpheli bağlantılar, en kısa yol ve merkezilik analizi.',
    'f2.t': 'Şahıs profilleri',
    'f2.d': 'Rol, tehdit seviyesi, eşkal. Birden fazla ana ve diğer fotoğraf; her görselin SHA-256 özeti saklanır.',
    'f3.t': '50+ tanımlayıcı',
    'f3.d': "Tanıdık, aile, iş ve eğitim geçmişi; Instagram'dan GitHub'a, WhatsApp'tan Telegram kanallarına 25+ platform; sızıntı kaydı.",
    'f4.t': 'Harita ve kroki',
    'f4.d': 'OpenStreetMap (anahtarsız) ya da Google Maps. Ziyaret, görülme kaydı, yarıçap ve yoğunluk.',
    'f5.t': 'Kronoloji',
    'f5.d': 'Olaylar, konum ziyaretleri, görülmeler ve deliller tek zaman çizelgesinde birleşir.',
    'f6.t': 'Delil kasası',
    'f6.d': 'SHA-256 bütünlük özeti, yeniden doğrulama ve teslim zinciri. Her işlem kayda geçer.',
    'f7.t': 'PDF ve HTML rapor',
    'f7.d': 'Koyu ya da açık tema, sayfa numarası, gizlilik bandı. Hassas alanlar için karartma, sızıntı takibi için filigran.',
    'f8.t': 'Şifreli dosya',
    'f8.d': 'Dosyayı AES-256-GCM ile parolalayın. Otomatik kurtarma kaydı da şifreli tutulur.',
    'rep.kicker': 'RAPOR',
    'rep.title': 'Masadan çıkan belge, masanın kendisi kadar düzenli',
    'rep.l1': 'Kapakta hedefin fotoğrafı, künye ve dosya parmak izi',
    'rep.l2': 'Her şahıs için fotoğraflı profil kartı ve bağlı tanımlayıcılar',
    'rep.l3': 'Ağ şeması, konum krokisi ve görsel kronoloji',
    'rep.l4': 'Her sayfada gizlilik bandı ve “Sayfa X / Y”',
    'rep.l5': 'Karartma açıkken hassas değerler çıktıya hiç yazılmaz',
    'rep.l6': 'Rapor dili arayüz diliyle aynıdır: TR ya da EN',
    'rep.cta': 'Örnek dosyayla rapor al',
    'smp.kicker': 'ÖRNEK DOSYALAR',
    'smp.title': 'Kurgusal bir soruşturmayla hemen deneyin',
    'smp.sub': 'Tüm kişi, örgüt, numara ve yerler kurgusaldır; fotoğraflar sentetik silüetlerdir.',
    'smp.open': 'Örneği aç',
    'smp.subjects': 'şahıs',
    'smp.identifiers': 'tanımlayıcı',
    'smp.photos': 'fotoğraf',
    'smp.evidence': 'delil',
    'prv.kicker': 'GİZLİLİK',
    'prv.title': 'Sunucu yok. Hesap yok. İzleme yok.',
    'p1.t': 'Veriler tarayıcıda kalır',
    'p1.d': 'Uygulama tamamen tarayıcınızda çalışır. Dosyalar bu cihazda tutulur; indirip saklamak sizin elinizdedir.',
    'p2.t': 'Kayıt ve giriş gerekmez',
    'p2.d': 'E-posta, parola, hesap yok. Sayfayı açın, dosyayı başlatın.',
    'p3.t': 'Sorumlu kullanım',
    'p3.d': 'OSINT Case, yetkili soruşturma ve araştırmalar içindir. Kişisel verileri yalnızca yasal dayanak ve amaç dahilinde işleyin.',
    'fin.title': 'Dosyayı açın, izleri birleştirin.',
    'foot.based': 'OSINTMapper (Geistnigma) tabanlıdır.',
    title: 'OSINT Case · Soruşturma ve istihbarat analiz masası',
  },
  en: {
    band: 'OSINT CASE · INVESTIGATION & INTELLIGENCE ANALYSIS DESK',
    'nav.screens': 'Screens',
    'nav.features': 'Features',
    'nav.report': 'Report',
    'nav.samples': 'Samples',
    'nav.privacy': 'Privacy',
    'cta.start': 'Start investigation',
    'cta.sample': 'Open a sample case',
    'hero.kicker': 'OPEN SOURCE · SERVERLESS · NO SIGN-UP',
    'hero.title': 'Pull scattered traces into a single case file.',
    'hero.lead': 'Subjects, accounts, locations, evidence and timeline on one desk. See the link network, grade your sources and export the report as PDF or HTML in one click. Your data never leaves the browser.',
    's1.t': 'Open a case',
    's1.d': 'Set up the case header with number, classification, target and legal basis. The classification band shows on every page.',
    's2.t': 'Collect and link',
    's2.d': 'More than 50 identifier types, subject photos, locations and evidence. Drag to connect, grade each source with an Admiralty code.',
    's3.t': 'Report',
    's3.d': 'Cover, subject profiles, network diagram, timeline and evidence list. Dark or light theme, redaction and watermark.',
    'scr.kicker': 'SCREENS',
    'scr.title': 'A whole investigation in one window',
    'tab.network': 'Link network',
    'tab.subject': 'Subjects & photos',
    'tab.timeline': 'Timeline',
    'tab.evidence': 'Evidence vault',
    'tab.report': 'Report',
    'cap.network': 'Subjects, accounts, organisations, vehicles and money flows in one network. Main photos show as avatars on the nodes.',
    'cap.subject': 'Several main and additional photos; drag & drop or paste with Ctrl+V. A SHA-256 hash of every original is kept.',
    'cap.timeline': 'Events, visits, sightings and evidence merged into one month-by-month timeline.',
    'cap.evidence': 'Exhibit number, SHA-256 hash, re-verification and chain of custody.',
    'cap.report': 'Report preview: theme, sections, redaction and watermark; export as PDF or a single-file HTML.',
    'feat.kicker': 'FEATURES',
    'feat.title': 'Everything an investigation desk needs',
    'f1.t': 'Link network',
    'f1.d': 'Drag-to-connect nodes, confirmed / probable / doubtful links, shortest path and centrality.',
    'f2.t': 'Subject profiles',
    'f2.d': 'Role, threat level, description. Several main and additional photos, each with a SHA-256 hash.',
    'f3.t': '50+ identifiers',
    'f3.d': 'Acquaintances, family, employment and education; 25+ platforms from Instagram to GitHub and WhatsApp to Telegram channels; breach records.',
    'f4.t': 'Map & sketch',
    'f4.d': 'OpenStreetMap (no key) or Google Maps. Visits, sightings, radius and density.',
    'f5.t': 'Timeline',
    'f5.d': 'Events, location visits, sightings and evidence merged into one timeline.',
    'f6.t': 'Evidence vault',
    'f6.d': 'SHA-256 integrity hash, re-verification and chain of custody. Every action is logged.',
    'f7.t': 'PDF & HTML report',
    'f7.d': 'Dark or light theme, page numbers, classification band. Redaction for sensitive fields, watermark for leak tracing.',
    'f8.t': 'Encrypted files',
    'f8.d': 'Protect the file with AES-256-GCM. The autosave copy is encrypted too.',
    'rep.kicker': 'REPORT',
    'rep.title': 'The document that leaves the desk is as tidy as the desk',
    'rep.l1': 'Cover with the target photo, case header and file fingerprint',
    'rep.l2': 'A photo profile card for every subject with linked identifiers',
    'rep.l3': 'Network diagram, location sketch and visual timeline',
    'rep.l4': 'Classification band and “Page X / Y” on every page',
    'rep.l5': 'With redaction on, sensitive values never reach the output',
    'rep.l6': 'The report follows the interface language: TR or EN',
    'rep.cta': 'Try a report with a sample',
    'smp.kicker': 'SAMPLE CASES',
    'smp.title': 'Try it right away with a fictional investigation',
    'smp.sub': 'All people, organisations, numbers and places are fictional; photos are synthetic silhouettes.',
    'smp.open': 'Open sample',
    'smp.subjects': 'subjects',
    'smp.identifiers': 'identifiers',
    'smp.photos': 'photos',
    'smp.evidence': 'evidence',
    'prv.kicker': 'PRIVACY',
    'prv.title': 'No server. No account. No tracking.',
    'p1.t': 'Data stays in the browser',
    'p1.d': 'The app runs entirely in your browser. Files are kept on this device; downloading and storing them is up to you.',
    'p2.t': 'No sign-up, no login',
    'p2.d': 'No e-mail, no password, no account. Open the page and start a case.',
    'p3.t': 'Responsible use',
    'p3.d': 'OSINT Case is meant for authorised investigations and research. Process personal data only with a lawful basis and purpose.',
    'fin.title': 'Open a case. Connect the traces.',
    'foot.based': 'Based on OSINTMapper by Geistnigma.',
    title: 'OSINT Case · Investigation & intelligence analysis desk',
  },
};

const DEFAULT_SAMPLE = { tr: 'kara-sahin', en: 'nightjar' };

function readLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'tr' || v === 'en') return v;
  } catch {}
  const nav = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
  return nav && !nav.startsWith('tr') ? 'en' : 'tr';
}

let lang = readLang();
let activeTab = 'subject';
let samples = [];

function shot(name) {
  return `/site/shots/${lang}-${name}.webp`;
}

function apply() {
  const d = T[lang];
  document.documentElement.lang = lang;
  document.title = d.title;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = d[el.dataset.i18n];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll('img[data-shot]').forEach((img) => {
    img.src = shot(img.dataset.shot);
  });
  document.querySelectorAll('.lang button').forEach((b) => {
    b.classList.toggle('on', b.dataset.lang === lang);
  });
  const sampleHref = `/app/?sample=${DEFAULT_SAMPLE[lang]}`;
  document.getElementById('hero-sample').href = sampleHref;
  document.getElementById('report-sample').href = sampleHref;
  setTab(activeTab);
  renderSamples();
}

function setTab(key) {
  activeTab = key;
  document.querySelectorAll('.tabs button').forEach((b) => {
    const on = b.dataset.tab === key;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const img = document.getElementById('tab-img');
  img.dataset.shot = key;
  img.src = shot(key);
  document.getElementById('tab-cap').textContent = T[lang][`cap.${key}`] ?? '';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

const CLS_COLOR = {
  'tasnif-disi': ['#2f7d46', '#fff'],
  'hizmete-ozel': ['#2b5f9e', '#fff'],
  ozel: ['#6b3fa0', '#fff'],
  gizli: ['#b3261e', '#fff'],
  'cok-gizli': ['#d96b00', '#111'],
};
const CLS_LABEL = {
  tr: { 'tasnif-disi': 'TASNİF DIŞI', 'hizmete-ozel': 'HİZMETE ÖZEL', ozel: 'ÖZEL', gizli: 'GİZLİ', 'cok-gizli': 'ÇOK GİZLİ' },
  en: { 'tasnif-disi': 'UNCLASSIFIED', 'hizmete-ozel': 'RESTRICTED', ozel: 'CONFIDENTIAL', gizli: 'SECRET', 'cok-gizli': 'TOP SECRET' },
};

function renderSamples() {
  const box = document.getElementById('samples');
  if (!box) return;
  if (!samples.length) {
    box.innerHTML = '';
    return;
  }
  const d = T[lang];
  box.innerHTML = samples
    .map((s) => {
      const [bg, fg] = CLS_COLOR[s.classification] ?? ['#444', '#fff'];
      const cls = CLS_LABEL[lang][s.classification] ?? '';
      const st = s.stats ?? {};
      return `<a class="sample" href="/app/?sample=${encodeURIComponent(s.id)}">
  <span class="sample-img">${s.cover ? `<img src="/samples/${esc(s.cover)}" alt="" loading="lazy">` : ''}
    ${cls ? `<span class="sample-cls mono" style="background:${bg};color:${fg}">${esc(cls)}</span>` : ''}</span>
  <span class="sample-body">
    <span class="sample-meta mono"><span>${esc(s.caseNumber)}</span><span class="sample-lang">${esc(String(s.lang).toUpperCase())}</span></span>
    <b>${esc(s.title?.[lang] ?? s.id)}</b>
    <span class="sample-desc">${esc(s.desc?.[lang] ?? '')}</span>
    <span class="sample-stats mono">${st.subjects ?? 0} ${d['smp.subjects']} · ${st.identifiers ?? 0} ${d['smp.identifiers']} · ${st.photos ?? 0} ${d['smp.photos']} · ${st.evidence ?? 0} ${d['smp.evidence']}</span>
    <span class="sample-go">${esc(d['smp.open'])} →</span>
  </span>
</a>`;
    })
    .join('');
}

document.querySelectorAll('.lang button').forEach((b) =>
  b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {}
    apply();
  }),
);
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

fetch('/samples/index.json')
  .then((r) => (r.ok ? r.json() : []))
  .then((j) => {
    samples = Array.isArray(j) ? j : [];
    renderSamples();
  })
  .catch(() => {});

apply();
