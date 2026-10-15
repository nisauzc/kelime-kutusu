# Kelime Kutusu

Kendi kelime listelerini CSV olarak yükleyip aralıklı tekrarla çalıştığın küçük bir web uygulaması.
Tek bir statik site; sunucu, hesap, internet bağlantısı gerekmiyor. İlerleme telefonun ya da
bilgisayarın tarayıcısında saklanıyor.

## Neler var

- **Deste türleri:** İngilizce → Türkçe, Japonca → Türkçe, Japonca → İngilizce
- **CSV yükleme:** `kelime, anlam, telaffuz` (üçüncü sütun isteğe bağlı, dördüncüsü grup adı).
  Ayraç virgül, noktalı virgül veya sekme olabilir; başlık satırı varsa kendisi atlar.
  Anki için hazırlanmış dosyalardaki `#` satırları ve `<br>` etiketleri de temizlenir.
- **Çalışma mantığı:** Memrise gibi aşamalı tanıtım (tanışma → çoktan seçmeli → ters çoktan
  seçmeli → yazma), sonra Anki'nin SM-2 aralıklı tekrarı (Tekrar / Zor / İyi / Kolay).
- **Hazır desteler:** Howl B1 (128), Howl B2 (165), Günlük Japonca (58)
- Gece/gündüz teması, seri sayacı, 7 günlük tekrar tahmini, JSON yedek alma ve yükleme
- Telefona kurulabilir (PWA), çevrimdışı çalışır

## Dosya düzeni

```
index.html          arayüz iskeleti
css/style.css       görünüm
js/csv.js           CSV okuma
js/srs.js           aralıklı tekrar hesabı (SM-2)
js/store.js         veri deposu (localStorage)
js/study.js         oturum kuyruğu ve soru üretimi
js/ui.js            ekran çizimi ve çalışma akışı
js/app.js           açılış ve olay bağlantıları
data/starter.js     hazır desteler (burayı değiştirerek kendi hazır destelerini koyabilirsin)
manifest.json, sw.js, icons/
```

## GitHub Pages'e koymak

1. GitHub'da yeni bir depo aç, adı `kelime-kutusu` olsun.
2. Bu klasörün içindeyken:

```bash
git init
git add .
git commit -m "Kelime Kutusu ilk surum"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/kelime-kutusu.git
git push -u origin main
```

3. Depoda **Settings → Pages → Source: Deploy from a branch → main / (root)** seç.
4. Birkaç dakika sonra adres hazır: `https://KULLANICI_ADIN.github.io/kelime-kutusu/`
5. Telefonda o adresi aç, tarayıcı menüsünden "Ana ekrana ekle" de.

Sonraki güncellemeler için `git add . && git commit -m "..." && git push` yeterli,
Pages kendi kendine yeniden yayınlıyor.

## Kendi listeni eklemek

Desteler sekmesi → **+ Yeni deste** → deste türünü seç → CSV dosyasını seç ya da
"Elle yapıştır" ile listeyi yapıştır. Kaydetmeden önce ilk beş satırın önizlemesini görürsün.

Japonca destelerde üçüncü sütun okunuş (romaji) olarak kullanılıyor ve yazma adımında
Japonca yazmak yerine okunuşu yazıyorsun.

## Notlar

- İlerleme `localStorage`'da duruyor, yani her cihaz kendi ilerlemesini tutar.
  Cihaz değiştirirken Ayarlar → Yedeği indir / Yedeği yükle.
- Tarayıcı verilerini temizlersen ilerleme de gider; arada bir yedek almak iyi olur.
