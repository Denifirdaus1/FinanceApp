# UX/UI Design System — Warm Minimal Finance

**Produk:** FinanceApp  
**Platform:** iOS dan Android 10+ (API 29+)  
**Target aksesibilitas:** WCAG 2.2 AA-inspired untuk aplikasi mobile, ditambah konvensi native iOS/Android  
**Tema:** warm pastel, cream, minimal, tenang, tidak kekanak-kanakan  
**Bahasa utama:** Indonesia (`id-ID`)  

## 1. Arah Pengalaman

FinanceApp harus terasa seperti meja kerja finansial yang rapi: hangat, dapat dipercaya, ringan, dan tidak menghakimi. Estetika pastel tidak boleh mengorbankan keterbacaan, ketepatan angka, atau kejelasan status.

### 1.1 Prinsip desain

1. **Tenang, bukan datar:** gunakan ruang kosong, permukaan cream, dan aksen terbatas; status penting tetap tegas.
2. **Angka adalah konten utama:** nominal menggunakan angka tabular, alignment konsisten, dan hierarchy yang lebih kuat daripada dekorasi.
3. **Jelaskan dampak sebelum aksi:** tombol transaksi menyebut jenis, nominal, dan rekening ketika tersedia.
4. **AI bersifat asistif:** OCR, suara, kategorisasi, dan insight menampilkan sumber, keyakinan, serta jalur koreksi.
5. **Privasi terlihat:** pengguna selalu tahu kapan angka disembunyikan, data diunggah, atau ruang dibagikan.
6. **Satu tindakan dominan:** satu primary action per layar atau sheet; secondary action tidak bersaing secara visual.
7. **Aksesibilitas sejak token:** warna, ukuran, fokus, haptics, dan motion memiliki aturan sistem, bukan perbaikan akhir.

## 2. Foundations

### 2.1 Semantic color tokens — Light

| Token | Hex | Penggunaan | Rasio acuan |
|---|---|---|---:|
| `color.canvas` | `#FFF9F0` | Latar aplikasi | — |
| `color.surface` | `#FFFDF8` | Card dan sheet | — |
| `color.surfaceRaised` | `#FFFFFF` | Modal/menu terangkat | — |
| `color.surfaceMuted` | `#F6EDDF` | Group, skeleton, field idle | — |
| `color.textPrimary` | `#2F241C` | Judul dan isi utama | 14.43:1 pada canvas |
| `color.textSecondary` | `#67584A` | Metadata dan label sekunder | 6.53:1 pada canvas |
| `color.textMuted` | `#756655` | Placeholder informatif | 5.30:1 pada canvas |
| `color.borderSubtle` | `#D8C9B8` | Divider dekoratif | Hanya non-esensial |
| `color.borderStrong` | `#927D69` | Batas kontrol/status | 3.74:1 pada canvas |
| `color.primary` | `#7A5C3E` | CTA, selected, link utama | 5.85:1 pada canvas |
| `color.onPrimary` | `#FFFDF8` | Teks di atas primary | sekitar 6:1 |
| `color.primaryContainer` | `#F0DDC5` | Highlight hangat | — |
| `color.onPrimaryContainer` | `#49301D` | Teks pada container | Verifikasi per pasangan |
| `color.success` | `#2F6B4F` | Pemasukan/sukses | 6.01:1 pada canvas |
| `color.warning` | `#8A4B0F` | Peringatan/perlu review | 6.48:1 pada canvas |
| `color.danger` | `#A13B32` | Error/pengeluaran kritis | 6.29:1 pada canvas |
| `color.info` | `#355F87` | Info/fokus/link alternatif | 6.39:1 pada canvas |
| `color.scrim` | `#2F241C99` | Overlay modal | — |
| `color.skeleton` | `#E9DDCE` | Skeleton loading | Jangan meniru angka |

### 2.2 Semantic color tokens — Dark

| Token | Hex | Penggunaan | Rasio acuan |
|---|---|---|---:|
| `color.canvas` | `#17130F` | Latar aplikasi | — |
| `color.surface` | `#211B16` | Card dan sheet | — |
| `color.surfaceRaised` | `#2C241D` | Modal/menu terangkat | — |
| `color.surfaceMuted` | `#352B23` | Group, skeleton, field idle | — |
| `color.textPrimary` | `#FFF7EC` | Judul dan isi utama | 17.39:1 pada canvas |
| `color.textSecondary` | `#DCCDBD` | Metadata dan label sekunder | 11.89:1 pada canvas |
| `color.textMuted` | `#BBAA99` | Placeholder informatif | 8.20:1 pada canvas |
| `color.borderSubtle` | `#4E4034` | Divider dekoratif | Hanya non-esensial |
| `color.borderStrong` | `#776552` | Batas kontrol/status | 3.32:1 pada canvas |
| `color.primary` | `#E3B98B` | CTA, selected, link utama | 10.19:1 pada canvas |
| `color.onPrimary` | `#2A1C10` | Teks di atas primary | Verifikasi per pasangan |
| `color.primaryContainer` | `#4C3725` | Highlight hangat | — |
| `color.onPrimaryContainer` | `#FFE4C6` | Teks pada container | Verifikasi per pasangan |
| `color.success` | `#7CC9A4` | Pemasukan/sukses | 9.46:1 pada canvas |
| `color.warning` | `#F3BA74` | Peringatan/perlu review | 10.64:1 pada canvas |
| `color.danger` | `#F49A91` | Error/pengeluaran kritis | 8.69:1 pada canvas |
| `color.info` | `#8CC4F7` | Info/fokus/link alternatif | 9.99:1 pada canvas |
| `color.scrim` | `#000000B3` | Overlay modal | — |
| `color.skeleton` | `#40352B` | Skeleton loading | Jangan meniru angka |

**Caveat kontras:** rasio di atas dihitung terhadap `color.canvas`; kontras harus diuji ulang pada pasangan latar aktual, state disabled, opacity, compositing, dan perangkat nyata. `borderSubtle` tidak boleh menjadi satu-satunya penanda batas kontrol. Target teks normal minimum 4.5:1, teks besar 3:1, dan komponen/focus indicator 3:1. Warna tidak pernah menjadi satu-satunya pembeda status.

### 2.3 Aturan warna finansial

- Pemasukan: `success` + ikon panah masuk + label “Pemasukan”.
- Pengeluaran: `textPrimary` untuk angka biasa; `danger` hanya untuk error, overspend, atau risiko—bukan untuk mempermalukan pengeluaran normal.
- Transfer: `info` + ikon dua arah.
- Draf/perlu review: `warning` + ikon jam/tanda seru.
- Nilai netral: `textPrimary`; negatif memakai tanda minus dan label, tidak hanya merah.
- Selected state menggabungkan warna, fill/container, stroke, dan indikator ikon/check.

### 2.4 Typography

Gunakan **Plus Jakarta Sans** untuk antarmuka dan fallback `SF Pro Text` di iOS, `Roboto` di Android, lalu sans-serif sistem. Nominal mengaktifkan tabular numerals (`fontVariant: ['tabular-nums']`). Bila font kustom gagal dimuat, layout tidak boleh berubah secara fungsional.

| Style | Size/line | Weight | Penggunaan |
|---|---:|---:|---|
| `display` | 32/40 | 700 | Hero insight, maksimum 2 baris |
| `heading1` | 28/36 | 700 | Judul layar |
| `heading2` | 24/32 | 700 | Judul section utama |
| `heading3` | 20/28 | 650 | Judul card/sheet |
| `title` | 18/26 | 600 | Row title, modal title |
| `bodyLarge` | 16/24 | 500 | Isi penting dan input |
| `body` | 14/21 | 400 | Isi standar |
| `label` | 13/18 | 600 | Button, tab, field label |
| `caption` | 12/16 | 500 | Metadata singkat |
| `amountHero` | 36/44 | 700 | Saldo utama |
| `amountCard` | 22/28 | 700 | Nominal card |
| `amountRow` | 15/22 | 650 | Nominal transaksi |

Aturan:

- Hormati Dynamic Type/font scaling sampai sedikitnya 200%.
- Jangan mengunci tinggi elemen yang berisi teks; gunakan `minHeight`.
- Maksimum panjang baris body pada tablet: 72 karakter.
- Judul boleh truncate satu baris hanya pada navigation bar; konten inti harus wrap.
- `caption` tidak digunakan untuk instruksi atau error kritis.

### 2.5 Spacing dan grid

Basis spacing 4 dp/pt:

| Token | Nilai | Contoh |
|---|---:|---|
| `space.0` | 0 | Reset |
| `space.1` | 4 | Gap ikon kecil |
| `space.2` | 8 | Gap internal chip |
| `space.3` | 12 | Gap row/card |
| `space.4` | 16 | Padding kontrol |
| `space.5` | 20 | Margin layar ponsel |
| `space.6` | 24 | Jarak section |
| `space.8` | 32 | Pemisah section besar |
| `space.10` | 40 | Empty state |
| `space.12` | 48 | Hero spacing |
| `space.16` | 64 | Breakpoint spacing |

- Margin horizontal ponsel: 20; layar sempit ≤360 dp: 16.
- Grid tablet: 12 kolom, gutter 16, margin 32, content max-width 960.
- Form satu kolom max-width 680 pada tablet.
- Bottom navigation: tinggi konten 64 + safe-area; sheet dan CTA menghormati safe-area.
- Card list gap 12; section gap 24; field group gap 16.

### 2.6 Radius, stroke, dan elevation

| Token | Nilai | Penggunaan |
|---|---:|---|
| `radius.sm` | 8 | Chip, badge, field kecil |
| `radius.md` | 12 | Input, button |
| `radius.lg` | 16 | Card |
| `radius.xl` | 20 | Bottom sheet/modal |
| `radius.full` | 999 | Pill/avatar |
| `stroke.hairline` | 1 px fisik | Divider dekoratif |
| `stroke.control` | 1.5 dp | Input/control |
| `stroke.focus` | 2 dp | Focus ring |

Elevation:

- `level0`: tanpa bayangan; pemisahan melalui surface.
- `level1`: card interaktif, `0 2 8` dengan alpha hitam 8% light/24% dark.
- `level2`: sticky CTA dan menu, `0 6 20` dengan alpha 12%/32%.
- `level3`: modal, `0 12 32` dengan alpha 16%/40% plus scrim.
- Android memakai elevation ekuivalen 0/2/6/12; selalu pertahankan border agar bentuk terbaca di high contrast.

## 3. Komponen Inti

### 3.1 Buttons

- Tinggi default 52, compact 44; touch target minimum 48×48.
- Varian: Primary, Secondary, Tertiary, Destructive, Icon.
- State: default, pressed, focused, loading, disabled.
- Loading mempertahankan lebar dan mengganti leading icon dengan spinner; label tetap menjelaskan aksi.
- Disabled memiliki kontras yang dapat dibaca dan tidak menjadi pengganti validasi; jelaskan alasan dekat kontrol.
- Destructive hanya untuk konsekuensi destruktif, tidak untuk tombol “Batal”.

### 3.2 Text field, selector, dan amount input

- Label persisten di atas field; placeholder hanya contoh.
- Tinggi minimum 52, padding horizontal 16, gap label-error 6.
- State focus menggunakan `borderStrong` + focus ring `info`; error menggunakan `danger` + ikon + teks.
- Amount input menampilkan prefix mata uang sebagai label terpisah dan pemisah ribuan saat mengetik.
- Nilai tidak dibulatkan diam-diam. Mata uang tanpa minor unit, termasuk IDR default, tidak menampilkan desimal; mata uang lain mengikuti precision ISO.
- Picker panjang menggunakan searchable sheet, bukan dropdown sempit.

### 3.3 Navigation

- Bottom tab: ikon 24, label selalu terlihat, touch target 64×48 minimum.
- Top app bar: 56 + safe-area; satu judul, back, maksimum dua aksi.
- Active tab memakai container halus + ikon filled/lebih tebal + label semibold.
- Badge maksimum tampil `99+`; screen reader mengumumkan jumlah penuh.

### 3.4 Cards dan list rows

- Card default padding 16, radius 16, gap konten 12.
- Transaction row minimum 68; leading category icon 40, isi fleksibel, nominal rata kanan.
- Swipe action selalu memiliki alternatif melalui overflow menu.
- Saldo card tidak menggunakan gradien kuat; perbedaan rekening melalui ikon, nama, dan accent kecil.
- Tapping area seluruh card harus konsisten dan memiliki pressed state.

### 3.5 Chips, badges, dan status

- Filter chip minimum tinggi 36; pilihan multi-select menampilkan check.
- Status badge berisi ikon + teks, bukan warna saja.
- Maksimum tiga chip terlihat dalam row transaksi; sisanya menjadi `+N`.
- Badge status bukan tombol kecuali affordance dan accessibility role menyatakan tombol.

### 3.6 Feedback components

- Inline validation untuk field.
- Banner untuk offline, sync conflict, atau dampak lintas layar.
- Toast untuk hasil reversible; tampil 5 detik dan menyediakan Undo.
- Dialog untuk keputusan berisiko atau autentikasi ulang.
- Bottom sheet untuk pilihan/entry singkat; full-screen untuk form kompleks.
- Skeleton setelah 300 ms; spinner hanya untuk area kecil atau proses tak tentu.

### 3.7 Financial components

**Money:** tanda minus berada sebelum simbol (`-Rp125.000`), pemasukan opsional `+Rp125.000`, privacy state `••••`, dan accessibility label “minus seratus dua puluh lima ribu rupiah”.

**Progress budget:** bar + nilai terpakai + sisa + periode. Overspend menampilkan nilai dan saran, bukan warna merah saja.

**Account balance:** nama rekening, tipe, saldo, mata uang, status sync, dan waktu pembaruan terakhir.

**Transaction source:** badge `Manual`, `Suara`, `Struk`, `Impor`, `Bank`, atau `AI suggestion`; label sumber tidak boleh hilang setelah diedit.

## 4. Charts dan Data Visualization

### 4.1 Palette

| Seri | Light | Dark | Bentuk/pola alternatif |
|---|---|---|---|
| 1 Primary | `#7A5C3E` | `#E3B98B` | Solid/circle |
| 2 Success | `#2F6B4F` | `#7CC9A4` | Diagonal/square |
| 3 Info | `#355F87` | `#8CC4F7` | Dot/triangle |
| 4 Danger | `#A13B32` | `#F49A91` | Cross/diamond |
| 5 Plum | `#6F4E8C` | `#C5A7E8` | Horizontal/hexagon |
| 6 Amber | `#8A4B0F` | `#F3BA74` | Vertical/star |

### 4.2 Aturan chart

- Maksimum enam seri; kategori tambahan digabung “Lainnya” dengan drill-down.
- Jangan gunakan pie/donut untuk lebih dari lima bagian atau untuk perbandingan presisi; gunakan bar terurut.
- Baseline bar chart selalu nol. Line chart boleh memakai rentang relevan dengan label eksplisit.
- Tooltip dapat dibuka tap dan navigasi keyboard/screen reader; isinya tersedia juga sebagai ringkasan teks/tabel.
- Gridline dekoratif, axis label minimum `caption`, dan nominal mengikuti privacy mode.
- Tren tidak disimpulkan hanya dari warna; gunakan panah, tanda, periode, dan kalimat.
- Screen reader menerima ringkasan, misalnya “Pengeluaran Agustus naik 8 persen dibanding Juli”, lalu akses ke tabel data.

## 5. Iconography dan Illustration

- Gunakan **Lucide**/outline geometris konsisten 2 dp pada ukuran 20/24; ikon selected boleh 2.5 dp atau fill yang setara.
- Ikon harus memiliki satu makna lintas aplikasi; dompet tidak boleh sekaligus berarti rekening dan anggaran.
- Ikon tanpa label hanya untuk pola universal: back, close, search, visibility; tetap mempunyai accessibility label.
- Ilustrasi menggunakan bentuk organik cream, peach, sage, dan dusty blue; tidak menampilkan uang terbang, rasa malu, atau stereotip gender.
- Foto struk dan logo institusi tidak dijadikan dekorasi.

## 6. Motion dan Haptics

### 6.1 Motion tokens

| Token | Durasi | Easing | Penggunaan |
|---|---:|---|---|
| `motion.instant` | 100 ms | ease-out | Press/focus |
| `motion.fast` | 180 ms | ease-out | Chip, toggle, tooltip |
| `motion.base` | 240 ms | standard | Sheet/card transition |
| `motion.slow` | 360 ms | ease-in-out | Chart period transition |

- Hindari parallax dan animasi saldo yang berulang.
- Angka boleh cross-fade; jangan count-up dari nol karena memberi kesan saldo berubah.
- `Reduce Motion` mengganti transform dengan cross-fade ≤150 ms dan menonaktifkan auto-animation chart.
- Tidak ada flashing lebih dari tiga kali per detik.

### 6.2 Haptics

- Light: pilihan chip, keypad penting, mulai/berhenti rekam.
- Medium: transaksi tersimpan, transfer terkonfirmasi.
- Warning: konflik sync atau field perlu koreksi.
- Error: hanya ketika aksi benar-benar gagal.
- Haptics tidak menggantikan feedback visual/audio dan mengikuti pengaturan sistem.

## 7. Accessibility Specification

- Touch target minimum 48×48 dp; jarak target berdekatan minimal 8 dp.
- Semua teks normal minimum 4.5:1; komponen, grafik penting, dan fokus minimum 3:1.
- Focus ring 2 dp `info` dengan offset 2; jangan tertutup keyboard, sheet, atau sticky footer.
- Mendukung VoiceOver dan TalkBack: role, name, value, state, hint; group card agar tidak menghasilkan fokus dekoratif berlebihan.
- Heading membentuk hierarchy; setiap layar mempunyai satu heading level utama.
- Gesture drag/swipe/pinch memiliki tombol alternatif.
- Form tidak mengandalkan placeholder, warna, atau urutan visual semata.
- Error diumumkan melalui live region dan fokus pindah ke ringkasan error hanya saat submit gagal.
- Ukuran teks 200%, bold text, high contrast, reduce motion, reduce transparency, dan grayscale diuji.
- Landscape dan layar kecil 320 dp tidak memotong CTA atau nominal.
- Auth tidak mengandalkan tes kognitif; Google OAuth dan biometrik memiliki fallback yang dapat diakses.

Rujukan penerapan mobile: https://www.w3.org/TR/wcag2mobile-22/

## 8. Lokalisasi Indonesia dan Format Finansial

### 8.1 Bahasa

- Nada: jelas, suportif, langsung; gunakan “kamu” secara konsisten.
- Hindari “gagal total”, “boros”, “buruk”, atau copy yang mempermalukan.
- Gunakan kata kerja pada CTA: **Simpan transaksi**, **Tinjau hasil**, **Hubungkan rekening**.
- String tidak dirangkai dari fragmen; sediakan kalimat utuh agar siap diterjemahkan.
- Layout mengakomodasi ekspansi teks 35% dan bahasa right-to-left di masa depan.

### 8.2 IDR dan angka

- Format default: `Rp125.000`, `Rp1.250.000`, `-Rp125.000`.
- Gunakan `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` sebagai basis, lalu uji output platform.
- Input menerima `125000`, `125.000`, atau paste `Rp 125.000`; simpan dalam minor-unit integer sesuai mata uang, bukan float.
- Jangan memakai singkatan `rb/jt` pada input, konfirmasi, ekspor, atau detail; singkatan hanya boleh pada axis chart sempit dengan tooltip nilai penuh.
- Persentase: `12,5%`; angka desimal menggunakan koma; pemisah ribuan menggunakan titik.
- Nilai mata uang asing menampilkan nilai asli dahulu dan ekuivalen basis di bawahnya beserta kurs/tanggal.

### 8.3 Tanggal dan waktu

- Ringkas: `24 Agu`; lengkap: `24 Agustus 2026`; waktu: `14.30`.
- Relative time hanya untuk kurang dari 24 jam dan selalu tersedia tanggal absolut pada detail.
- Minggu dimulai Senin untuk default Indonesia; pengguna dapat mengubah.
- Zona waktu mengikuti perangkat, disimpan bersama transaksi, dan perubahan zona tidak mengubah waktu historis diam-diam.

## 9. Privacy Mode

### 9.1 Level

1. **Mati:** semua detail sesuai izin ruang.
2. **Sembunyikan nominal:** saldo, nominal, axis, tooltip, widget, dan notifikasi menjadi `••••`.
3. **Sembunyikan semua detail:** juga menyamarkan nama merchant, rekening, kategori, insight, dan kalender.

### 9.2 Perilaku

- Toggle tersedia dari ikon mata di header; state diumumkan ke screen reader.
- Reveal sementara melalui tahan 600 ms atau biometrik, berakhir setelah 30 detik, lock, screenshot, atau app background.
- App switcher selalu menampilkan privacy overlay bila salah satu level aktif.
- Widget default tersembunyi; pengguna mengaktifkan nominal widget secara eksplisit.
- Export dan share sheet selalu menampilkan preview cakupan data, terlepas dari state visual privacy mode.

### 9.3 Penghapusan akun

- Confirmation screen merangkum data yang dihapus, dampak household, session yang dicabut, grace period 7 hari, dan tanggal purge aktif dalam format absolut.
- CTA destruktif memakai label **Jadwalkan penghapusan akun**, memerlukan recent authentication, dan tidak ditempatkan berdekatan dengan logout.
- Selama Day 0–7, layar status menampilkan countdown, tanggal purge, serta CTA **Batalkan penghapusan**; pembatalan memerlukan autentikasi ulang.
- Setelah Day 7, tampilkan status final tanpa janji pemulihan. Copy menjelaskan backup aging out maksimal hari ke-30 sejak permintaan penghapusan awal dan tidak dapat digunakan untuk menghidupkan kembali akun.

## 10. Receipt Confirmation UX

### 10.1 Capture

- Primer izin menjelaskan bahwa kamera digunakan untuk membaca struk dan metode manual tetap tersedia.
- Overlay menunjukkan tepi, kestabilan, glare, dan blur; capture otomatis dapat dimatikan.
- Multi-page ditampilkan sebagai thumbnail berurutan dengan delete/retake.

### 10.2 Review

- Header: thumbnail, merchant, tanggal, total, status keyakinan.
- Body: field terstruktur dan item list yang dapat diedit.
- Field confidence rendah diberi label “Perlu dicek”, bukan skor teknis.
- Perbedaan `jumlah item + pajak - diskon` terhadap total tampil sebagai banner.
- Kemungkinan duplikat menampilkan transaksi pembanding dan pilihan **Gunakan yang lama**, **Simpan juga**, atau **Gabungkan lampiran**.
- CTA final menyebut nominal dan rekening; tidak ada auto-save ke ledger.

### 10.3 Privasi

- Tampilkan pilihan **Hapus foto setelah dibaca** sebagai default aktif.
- Jika pengguna menyimpan lampiran, jelaskan sinkronisasi dan siapa di ruang rumah tangga yang dapat melihat.
- Jangan tampilkan gambar struk pada notification preview atau recent-app snapshot.

## 11. Voice Confirmation UX

### 11.1 Recording

- State idle menampilkan contoh lokal: “Pengeluaran makan siang 45 ribu dari GoPay.”
- State listening menampilkan indikator hidup, timer, Stop, dan Cancel; tidak menampilkan waveform dekoratif sebagai satu-satunya status.
- Batas satu utterance 30 detik; pada 25 detik tampil peringatan halus.
- Interupsi telepon/audio menghentikan rekaman dan mempertahankan draf yang aman.

### 11.2 Parsing dan klarifikasi

- Draf dibagi menjadi jenis, nominal, rekening, kategori, tanggal, dan catatan.
- Informasi yang tidak terdengar tidak ditebak. Pertanyaan klarifikasi fokus satu field per langkah.
- Koreksi dapat dilakukan dengan tap atau suara; rekaman baru tidak menimpa field yang sudah dikunci pengguna.
- Tampilkan “Diproses di perangkat” atau “Diproses aman di cloud” sebelum rekam sesuai jalur aktual.

### 11.3 Konfirmasi

- Bacakan ringkasan hanya bila pengguna mengaktifkan feedback suara dan perangkat tidak silent.
- CTA final: “Simpan pengeluaran Rp45.000 dari GoPay”.
- Transkrip dihapus setelah parsing secara default; analytics hanya menerima status sukses/gagal dan durasi bucket, tidak pernah audio/transkrip/nominal.

## 12. Content Patterns

| Situasi | Gunakan | Hindari |
|---|---|---|
| Berhasil | “Transaksi disimpan.” | “Mantap! Kamu berhasil mengontrol uang!” |
| Offline | “Offline—perubahan disimpan di perangkat.” | “Tidak ada internet.” tanpa dampak |
| OCR rendah | “Beberapa bagian perlu dicek.” | “AI hanya 42% yakin.” |
| Overspend | “Anggaran Makan terlampaui Rp80.000.” | “Kamu boros bulan ini.” |
| Bank reauth | “Hubungkan ulang agar transaksi terbaru dapat disinkronkan.” | “Bank error.” |
| Penghapusan | “Akun dijadwalkan dihapus dalam 7 hari.” | “Akun hilang segera.” |

## 13. Anti-patterns

- Pastel berkontras rendah untuk teks, border kontrol, atau status.
- Gradien, glassmorphism, dan shadow berat pada setiap card.
- Menampilkan semua fitur di Beranda atau memakai carousel tersembunyi untuk fungsi kritis.
- Warna merah untuk semua pengeluaran normal.
- Menyimpan hasil OCR/voice tanpa review eksplisit.
- Menampilkan confidence score teknis tanpa tindakan yang jelas.
- Tombol disabled tanpa alasan atau pemulihan.
- Placeholder sebagai label, ikon tanpa nama, atau swipe tanpa alternatif.
- Count-up saldo, confetti finansial, streak yang memicu rasa bersalah, dan dark pattern consent.
- Nominal/merchant di analytics, crash log, notification lock screen, screenshot, atau support ID.
- Modal bertumpuk lebih dari satu tingkat.
- Mengubah urutan kategori atau rekening berdasarkan AI tanpa persetujuan pengguna.

## 14. Design-to-Engineering Handoff Checklist

### Setiap layar

- [ ] Route, feature ID, role, dan ruang data terdefinisi.
- [ ] Light/dark, portrait/landscape relevan, layar 320 dp, dan tablet tersedia.
- [ ] Perilaku native diuji pada Android 10/API 29 sebagai minimum serta versi iOS yang ditetapkan release matrix.
- [ ] Default, pressed, focus, disabled, loading, empty, offline, error, success, dan privacy state tersedia.
- [ ] Keyboard terbuka, safe-area, dan text scale 200% diuji.
- [ ] Copy final Indonesia dan contoh nominal/tanggal realistis tersedia.
- [ ] Accessibility role/name/value/state/hint dan focus order dicatat.
- [ ] Event analytics dari `08-analytics-measurement.md` dipetakan beserta kategori consent dan property allowlist; tanpa payload sensitif.
- [ ] Redaction untuk notifikasi, widget, screenshot, recent-app/app-switcher preview, accessibility label, log, dan support ID ditentukan per state.

### Setiap komponen

- [ ] Menggunakan semantic token, bukan hex langsung.
- [ ] Touch target ≥48×48 dan kontras pasangan aktual lulus.
- [ ] Varian dan state memiliki nama konsisten di design library dan kode.
- [ ] Spacing, radius, icon size, typography, dan responsive behavior terdokumentasi.
- [ ] Haptics/motion serta fallback Reduce Motion ditentukan.
- [ ] Tidak mengandalkan warna, gesture, atau placeholder saja.

### Alur keuangan/AI

- [ ] Dampak terhadap saldo terlihat sebelum konfirmasi.
- [ ] Sumber data dan status review terlihat.
- [ ] Duplicate, low confidence, konflik, dan partial failure memiliki desain.
- [ ] Undo/idempotency dan perilaku offline ditentukan.
- [ ] Receipt/audio/transcript retention dan izin ruang dijelaskan kepada pengguna.

## 15. Quality Gate

Design siap dikembangkan hanya bila seluruh layar Phase 1 — Core Ledger dan setiap critical path pada release gate memiliki prototype interaktif, semua token sudah menjadi semantic variables, seluruh pasangan warna aktual lulus audit kontras, VoiceOver/TalkBack flow telah direview, dan receipt/voice/privacy mode memiliki state lengkap tanpa asumsi tersembunyi.
