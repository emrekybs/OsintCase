# Soruşturma Dosyaları

Tarayıcıda çalışan, sunucusuz bir soruşturma/istihbarat analiz panosu. Şahısları ve tanımlayıcıları bir bağlantı ağında, konumları haritada, olayları kronolojide, delilleri SHA-256 bütünlük kaydıyla tek bir dosyada toplar. Hiçbir veri cihazdan çıkmaz.

> Bu proje, [anonymousRAID/OSINT-Mapping-Tool](https://github.com/anonymousRAID/OSINT-Mapping-Tool) (GPL-3.0) üzerine geliştirilmiş **değiştirilmiş bir sürümdür**. Değişiklikler aşağıda listelenmiştir. Lisans GPL-3.0 olarak devam eder; dağıtırken kaynak kodu da verilmelidir.

Ürün adı/başlık `src/brand.js` dosyasından değiştirilir.

## Kurulum

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # üretim derlemesi → dist/
```

Docker: `docker compose up --build` (ayrıntılar orijinal README ile aynı; Google Maps anahtarı `.env` içinden okunur, OpenStreetMap anahtarsız çalışır).

## Sekmeler

| Sekme | İçerik |
|---|---|
| **Ağ** | Tanımlayıcı düğümleri ve bağlantılar. Otomatik yerleşim, en kısa yol, merkezilik, PNG/SVG dışa aktarma |
| **Harita** | Konumlar, rota, yarıçap halkaları, yoğunluk (yaşam örüntüsü), görülme kayıtları |
| **Kronoloji** | Elle girilen olaylar + konum ziyaretleri + görülmeler + deliller, tek zaman çizelgesinde |
| **Deliller** | SHA-256 özetli delil kasası, teslim zinciri, doğrulama |
| **Kayıt** | Dosyadaki her işlemin kim/ne zaman kaydı, CSV dışa aktarma |

## Orijinale göre eklenenler

**Görünüm**
- Tamamen Türkçe arayüz, mat taktik tema (koyu/açık), IBM Plex yazı tipleri (pakete gömülü, internetten yüklenmez)
- Her ekranın üstünde/altında gizlilik bandı: TASNİF DIŞI · HİZMETE ÖZEL · ÖZEL · GİZLİ · ÇOK GİZLİ

**Dosya künyesi**
- Dosya no, gizlilik derecesi, durum, öncelik, soruşturmacı, birim, açılış tarihi, hukuki dayanak, özet
- Bu cihazdaki analist adı (işlem kaydına ve teslim zincirine otomatik yazılır)

**Yeni tanımlayıcı türleri**
- Şahıs (rol: şüpheli/sanık/tanık/mağdur/irtibatlı/muhbir; tehdit seviyesi; kod adı, uyruk, kimlik no, eşkal)
- Kuruluş, kimlik belgesi, genel kullanıcı adı, IP adresi, alan adı, cihaz (IMEI/MAC), kripto cüzdan, banka hesabı

**Analiz**
- Her tanımlayıcı ve olaya NATO Admiralty kaynak değerlendirmesi (A–F / 1–6), düğümde renkli kod
- Bağlantılara ilişki türü ve teyit derecesi (kesin / muhtemel / şüpheli → düz / kesikli / noktalı çizgi); çift tıkla düzenlenir
- Kuvvet yönlendirmeli otomatik yerleşim (Ctrl+Z ile geri alınır)
- Seçili iki düğüm arasında en kısa yol; bağlantı sayısı (merkezilik); küme sayısı
- Harita: yarıçap halkası, görülme kayıtları, yoğunluk katmanı

**Delil kasası**
- Eklenen her dosyanın SHA-256 özeti tarayıcıda hesaplanır; içerik isteğe bağlı olarak dosyaya gömülür (≤ 10 MB)
- Teslim zinciri (teslim alındı/edildi, muhafaza, inceleme…), doğrulama (dosya değişmiş mi?)
- Silme işlemi gerekçe ister ve kayda geçer

**Güvenlik**
- Dosya parolası: AES-256-GCM, anahtar PBKDF2-SHA256 (600.000 tur) ile türetilir → `*.osint.enc.json`
- Otomatik kurtarma kaydı IndexedDB'ye taşındı; parolalı dosyalarda kurtarma kaydı da şifreli (liste dosya adını bile göstermez)
- Otomatik kurtarma kaydı ayarlardan kapatılabilir
- Yüksek gizlilik dereceli dosya şifresiz kaydedilirken uyarı

**Rapor**
- A4 istihbarat raporu önizlemesi → Yazdır / PDF. Her sayfada gizlilik bandı, dosya parmak izi (SHA-256), şahıslar, tanımlayıcılar, ağ şeması, bağlantılar, konum krokisi, kronoloji, deliller + teslim zinciri, işlem kaydı, Admiralty cetveli, imza alanı

## Uyumluluk

- Orijinal sürümün `.osint.json` dosyaları (şema v1) olduğu gibi açılır; eksik alanlar boş gelir.
- Yeni dosyalar şema v2 ile yazılır. Eski localStorage kurtarma kayıtları ilk açılışta IndexedDB'ye taşınır.
- Alan anahtarları değiştirilmedi; yalnızca etiketler Türkçeleştirildi.

## Gizlilik

Sunucu yok, analitik yok. Dışarıya giden istekler yalnızca harita karoları ve adres aramasıdır (Google Maps ya da OpenStreetMap/Nominatim). Delil dosyaları, parolalar ve dosya içeriği hiçbir yere gönderilmez.

## Lisans

[GPL-3.0](LICENSE). Orijinal telif: OSINT-Mapping-Tool katkıcıları. Bu sürümdeki değişiklikler de GPL-3.0 kapsamındadır.
