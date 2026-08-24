# Arsitektur Informasi dan Navigasi

**Produk:** FinanceApp  
**Platform:** iOS dan Android 10+ (API 29+)  
**Audiens:** Product, Design, Mobile, Backend, QA, Data, Security  
**Status:** Baseline siap implementasi  
**Bahasa utama:** Indonesia (`id-ID`)  

## 1. Tujuan

Dokumen ini menetapkan struktur navigasi, inventaris layar, hak akses, dan perilaku lintas fitur untuk aplikasi pencatatan keuangan pribadi dan rumah tangga. Struktur sengaja mengutamakan tiga pekerjaan utama pengguna:

1. mencatat aktivitas keuangan secepat mungkin;
2. memahami posisi keuangan tanpa harus membaca laporan rumit;
3. merencanakan langkah berikutnya dengan anggaran, target, tagihan, dan proyeksi.

Setiap kemampuan menggunakan registry fitur F01–F24 yang sama dengan PRD dan dokumen implementasi fitur.

## 2. Prinsip Arsitektur Informasi

- **Catat dahulu, lengkapi kemudian:** transaksi dapat disimpan sebagai draf bila koneksi atau informasi belum lengkap.
- **Saldo tidak boleh berubah diam-diam:** hasil OCR, suara, AI, impor, dan sinkronisasi bank selalu memiliki sumber serta status yang terlihat.
- **Informasi sensitif bertahap:** nominal ditampilkan hanya ketika konteks, izin, dan privacy mode mengizinkan.
- **Satu objek, satu sumber kebenaran:** transaksi, rekening, anggaran, dan target memiliki detail kanonik; dashboard hanya menyajikan ringkasan dan tautan ke objek tersebut.
- **Progressive disclosure:** layar utama memperlihatkan keputusan terpenting; pengaturan lanjutan berada di detail atau menu konteks.
- **Offline-first untuk pencatatan:** pencatatan dan peninjauan tetap dapat dilakukan tanpa jaringan; operasi yang memerlukan server diberi status antre.
- **Aman untuk kesalahan manusia:** aksi destruktif, transfer, rekonsiliasi, dan publikasi data ke ruang bersama membutuhkan konfirmasi yang jelas.

### 2.1 Roadmap kanonis

| Fase | Fokus IA | Fitur/gate |
|---|---|---|
| Phase 0 — Foundation | Route registry, design system, data/security baseline, observability aman | Internal; belum membuka fitur end-user |
| Phase 1 — Core Ledger | Siklus ledger pribadi dan pencatatan manual | F01–F06; F16, F18, dan F24 dasar |
| Phase 2 — Capture/Daily | Input rendah friksi dan manfaat harian | F07–F09; F11 dasar; F13 inti; notifikasi F19 |
| Phase 3 — Planning | Pemahaman dan perencanaan lengkap | F10–F15; F16 lengkap |
| Phase 4 — Collaboration/Global | Portabilitas, globalisasi, kolaborasi, dan GA hardening | F17, F20, F23; hardening F18/F24; widget/shortcut F19 |
| Phase 5 — Optional AI/Bank | Intelligence dan konektivitas institusi yang opsional | F21 dan F22, dirilis independen setelah gate consent/safety/legal/partner |

Nama fase di atas adalah satu-satunya label roadmap yang digunakan dokumen ini. Fitur yang muncul pada dua fase mempunyai scope dasar terlebih dahulu, lalu hardening/kelengkapan pada fase berikutnya.

## 3. Model Ruang dan Peran

### 3.1 Ruang data

- **Ruang Pribadi:** dibuat otomatis untuk setiap akun. Hanya pemilik yang dapat mengakses.
- **Ruang Rumah Tangga:** ruang opsional dengan anggota dan peran. Pengguna dapat berpindah ruang dari pemilih ruang di header.
- **Tampilan Gabungan:** hanya agregasi lokal untuk pemilik dari ruang yang diizinkan; tidak mengubah kepemilikan transaksi.

Setiap rekening, transaksi, anggaran, target, tagihan, dan laporan memiliki `space_id`. Perpindahan ruang tidak boleh memindahkan data secara implisit.

### 3.2 Peran dan izin

| Kemampuan | Pemilik ruang | Admin rumah tangga | Anggota | Pengamat |
|---|---:|---:|---:|---:|
| Melihat ringkasan dan laporan ruang | Ya | Ya | Ya | Ya, tanpa detail tersembunyi |
| Membuat transaksi sendiri | Ya | Ya | Ya | Tidak |
| Mengubah transaksi sendiri | Ya | Ya | Ya | Tidak |
| Mengubah transaksi anggota lain | Ya | Ya | Tidak | Tidak |
| Mengelola rekening, kategori, aturan | Ya | Ya | Tidak | Tidak |
| Mengelola anggaran, target, tagihan | Ya | Ya | Usul/perbarui item yang ditugaskan | Tidak |
| Mengundang atau menghapus anggota | Ya | Ya, kecuali pemilik | Tidak | Tidak |
| Mengubah peran | Ya | Tidak untuk peran pemilik | Tidak | Tidak |
| Mengaktifkan sinkronisasi bank/e-wallet | Ya | Ya pada koneksi miliknya | Tidak | Tidak |
| Ekspor seluruh ruang | Ya | Ya | Hanya data miliknya | Tidak |
| Menghapus ruang | Ya setelah autentikasi ulang | Tidak | Tidak | Tidak |

Aturan tambahan:

- Pemilik ruang tidak dapat meninggalkan ruang sebelum memindahkan kepemilikan atau menghapus ruang.
- Nominal yang ditandai privat oleh pembuat tampil sebagai `••••` bagi anggota lain; agregasi ruang tidak memasukkan nominal privat kecuali pembuat memberi izin.
- Perubahan peran, ekspor, penghapusan, dan koneksi bank dicatat dalam audit log keamanan.
- Dukungan internal bukan peran pengguna dan tidak memperoleh akses isi keuangan melalui UI produk.

## 4. Struktur Navigasi

### 4.1 Tumpukan sebelum autentikasi

1. Splash dan pemeriksaan sesi.
2. Welcome.
3. Masuk dengan Google.
4. Penjelasan izin dan privasi.
5. Onboarding profil finansial.
6. Pemulihan sesi atau bantuan akses.

### 4.2 App shell setelah autentikasi

Bottom navigation memiliki lima tujuan tetap:

| Posisi | Destinasi | Isi utama | Badge |
|---|---|---|---|
| 1 | **Beranda** | Ringkasan harian, saldo, insight, agenda terdekat | Peringatan kritis saja |
| 2 | **Aktivitas** | Riwayat, pencarian, review, rekonsiliasi | Jumlah item perlu review |
| 3 | **Tambah** | Tombol aksi yang membuka Quick Add Sheet | Tidak ada |
| 4 | **Rencana** | Anggaran, target, tagihan, utang, kalender | Jumlah jatuh tempo |
| 5 | **Laporan** | Arus kas, net worth, kategori, periode | Tidak ada |

Avatar kanan atas membuka **Pusat Akun**: pemilih ruang, profil, rekening, kategori, koneksi, impor/ekspor, notifikasi, keamanan, privasi, aksesibilitas, dan bantuan.

### 4.3 Quick Add Sheet

Quick Add dapat dibuka dari tombol tengah, shortcut perangkat, widget, atau deep link. Urutan aksi:

1. Transaksi manual.
2. Bicara.
3. Scan struk.
4. Transfer.
5. Tagihan atau transaksi berulang.

Sheet mempertahankan konteks ruang aktif. Jika dibuka dari rekening atau anggaran, rekening/kategori terkait boleh dipraisi tetapi tetap terlihat dan dapat diubah.

### 4.4 Aturan navigasi

- Bottom tab mempertahankan posisi scroll dan filter terakhir dalam sesi yang sama.
- Detail dibuka sebagai push screen; input cepat dibuka sebagai bottom sheet layar penuh pada perangkat kecil.
- Tombol Back kembali ke keadaan sebelumnya, bukan selalu ke root tab.
- Deep link yang membutuhkan autentikasi disimpan, lalu dilanjutkan setelah login.
- Deep link ke objek tanpa izin membuka layar “Akses tidak tersedia” tanpa membocorkan nama atau nominal objek.
- Perubahan yang belum disimpan memunculkan pilihan **Simpan draf**, **Buang**, atau **Lanjut mengedit**.
- Search global hanya mencari di ruang aktif, dengan opsi eksplisit “Cari semua ruang”.

## 5. Inventaris Layar F01–F24

| ID | Fitur | Fase | Entry point | Layar dan state utama |
|---|---|---|---|---|
| F01 | Onboarding & Google Auth | Phase 1 — Core Ledger | Splash, logout, sesi kedaluwarsa | Welcome; Google OAuth; persetujuan; verifikasi sesi; pemulihan akses; logout semua perangkat |
| F02 | Financial Profile & Preferences | Phase 1 — Core Ledger | Onboarding, Pusat Akun | Tujuan penggunaan; mata uang utama; awal bulan anggaran; pemasukan rutin; preferensi ringkasan; personalisasi selesai |
| F03 | Accounts, Wallets, Assets & Liabilities | Phase 1 — Core Ledger | Beranda > saldo; Pusat Akun | Daftar rekening; tambah/edit rekening; detail rekening; penyesuaian saldo; aset; liabilitas; arsip rekening |
| F04 | Categories, Tags & Rules | Phase 1 — Core Ledger | Pusat Akun; editor transaksi | Daftar kategori; editor kategori; tag; aturan kategorisasi; urutan prioritas; konflik aturan |
| F05 | Manual Transaction | Phase 1 — Core Ledger | Quick Add; rekening; aktivitas | Pilih jenis; keypad nominal; detail transaksi; lampiran; review; sukses; draf |
| F06 | Transfers, Splits & Adjustments | Phase 1 — Core Ledger | Quick Add; detail transaksi/rekening | Transfer; biaya transfer; transaksi terbagi; penyesuaian saldo; review dampak ganda |
| F07 | Receipt Scan | Phase 2 — Capture/Daily | Quick Add > Scan struk | Izin kamera; kamera; crop/rotate; proses OCR; review baris; pencocokan duplikat; simpan |
| F08 | Voice Entry | Phase 2 — Capture/Daily | Quick Add > Bicara | Primer mikrofon; listening; live transcript lokal bila tersedia; parsed draft; klarifikasi; review; simpan |
| F09 | Dashboard & Daily Summary | Phase 2 — Capture/Daily | Tab Beranda | Ringkasan hari; saldo; arus masuk/keluar; budget watch; tugas review; insight; privacy mode |
| F10 | Reports, Cash Flow & Net Worth | Phase 3 — Planning | Tab Laporan | Overview; arus kas; pengeluaran kategori; pendapatan; net worth; perbandingan periode; drill-down |
| F11 | Budgets | Phase 2 dasar → Phase 3 lengkap | Tab Rencana | Daftar anggaran; buat/edit; detail progres; rollover; alokasi; overspend resolution |
| F12 | Goals & Sinking Funds | Phase 3 — Planning | Tab Rencana | Daftar target; buat target; kontribusi; jadwal; detail progres; selesai/jeda |
| F13 | Recurring Bills & Subscriptions | Phase 2 inti → Phase 3 lengkap | Rencana; Kalender | Daftar; deteksi kandidat; detail; jadwal; tandai dibayar; langganan; perubahan harga |
| F14 | Debt & Loans | Phase 3 — Planning | Rencana | Daftar utang/piutang; detail; cicilan; bunga/biaya; pembayaran; pelunasan; keterlambatan |
| F15 | Calendar & Forecast | Phase 3 — Planning | Rencana > Kalender | Kalender bulanan; agenda; detail hari; proyeksi saldo; skenario; risiko saldo negatif |
| F16 | Search, Review & Reconciliation | Phase 1 dasar → Phase 3 lengkap | Tab Aktivitas | Timeline; search; filter; transaksi perlu review; kemungkinan duplikat; rekonsiliasi; bulk review |
| F17 | Multi-currency | Phase 4 — Collaboration/Global | Rekening; transaksi; laporan | Pemilih mata uang; kurs; edit kurs; nilai asli/nilai basis; dampak selisih kurs |
| F18 | Offline & Sync | Phase 1 dasar → Phase 4 hardening | Global; Pusat Akun | Status offline; antrean perubahan; konflik; retry; detail sinkronisasi; penyelesaian konflik |
| F19 | Notifications, Widgets & Shortcuts | Phase 2 notifikasi → Phase 4 widget/shortcut | Pusat Akun; sistem operasi | Preferensi notifikasi; preview; konfigurasi widget; shortcut; quiet hours; deep-link destination |
| F20 | Import, Export & Backup | Phase 4 — Collaboration/Global | Pusat Akun > Data | Impor file; pemetaan kolom; validasi; preview; hasil; ekspor; backup; riwayat pekerjaan |
| F21 | AI Insights & Assistant | Phase 5 — Optional AI/Bank | Beranda; Laporan | Feed insight; detail penjelasan; assistant; saran aksi; feedback; pengaturan personalisasi AI |
| F22 | Bank & E-wallet Sync | Phase 5 — Optional AI/Bank | Pusat Akun > Koneksi | Katalog koneksi; consent provider; proses link; pemetaan rekening; status; refresh; reauth; putus koneksi |
| F23 | Household Sharing | Phase 4 — Collaboration/Global | Pemilih ruang; Pusat Akun | Buat ruang; anggota; undangan; peran; aktivitas ruang; aturan privasi; keluar/hapus ruang |
| F24 | Security, Privacy & Account Controls | Phase 1 dasar → Phase 4 hardening | Pusat Akun | Security center; biometrik; perangkat/sesi; privacy mode; consent analytics; audit log; unduh/hapus akun |

### 5.1 Domain sistem di luar registry fitur

Domain ini bukan fitur pengguna dan tidak menambah ID F01–F24:

| Owner sistem | Cakupan IA | Aturan analytics |
|---|---|---|
| `SYS_LIFECYCLE` | Splash, bootstrap session, app-ready, fatal recovery | `feature_id=null`, `system_domain=SYS_LIFECYCLE` |
| `SYS_RELEASE` | Check/download/apply OTA, restart prompt, rollback ke bundle aman, dan arahan update store untuk native build | `feature_id=null`, `system_domain=SYS_RELEASE` |

F18 tetap hanya memiliki offline/sync data dan F24 tetap hanya memiliki security/privacy/account controls. Dengan demikian OTA tidak dipaksakan ke salah satu feature ID dan tetap mempunyai owner operasional deterministik.

## 6. Onboarding Utama

Onboarding harus dapat selesai dalam satu sesi, dapat dilanjutkan, dan tidak meminta semua izin sekaligus.

### 6.1 Urutan

1. **Welcome:** nilai utama “Catat cepat, pahami uangmu, rencanakan dengan tenang.”
2. **Google Auth:** gunakan browser/system sheet; jangan meminta password Google di dalam aplikasi.
3. **Persetujuan inti:** kebijakan privasi dan syarat; analytics opsional dipisahkan dari syarat layanan.
4. **Tujuan:** pilih maksimal tiga—kontrol pengeluaran, menabung, tagihan, melunasi utang, memahami cash flow, keuangan keluarga.
5. **Profil dasar:** mata uang utama IDR, zona waktu perangkat, tanggal awal bulan finansial.
6. **Rekening pertama:** Tunai, bank, e-wallet, kartu kredit, atau “Lewati dan pakai Tunai”.
7. **Preferensi pencatatan:** manual, scan struk, suara; hanya menjelaskan izin, belum meminta izin OS.
8. **Notifikasi:** pilih pengingat tagihan/ringkasan; prompt izin OS hanya muncul setelah pengguna memilih manfaatnya.
9. **Transaksi pertama:** Quick Add terpandu; pengguna boleh melewati.
10. **Beranda siap:** checklist 3 langkah yang dapat ditutup permanen.

### 6.2 Syarat selesai

Onboarding dianggap selesai jika autentikasi berhasil, mata uang utama tersimpan, dan setidaknya satu rekening aktif tersedia. Tujuan, notifikasi, dan transaksi pertama dapat diselesaikan kemudian.

### 6.3 Kegagalan dan pemulihan

- OAuth dibatalkan: kembali ke Welcome dengan penjelasan netral, bukan error merah.
- Jaringan putus setelah OAuth: simpan state lokal terenkripsi dan tawarkan retry.
- Akun Google sudah terkait: lanjut ke pemulihan sesi, tidak membuat profil ganda.
- Akun dijadwalkan untuk dihapus: tampilkan countdown grace period 7 hari, tanggal purge aktif, dan pilihan batalkan penghapusan setelah autentikasi ulang.

## 7. Alur Quick Add

### 7.1 Manual (F05)

`Tambah → Pengeluaran/Pemasukan → Nominal → Rekening → Kategori → Review → Simpan`

- Keypad nominal mendapat fokus pertama dan mendukung paste yang disanitasi.
- Wajib: jenis, nominal lebih dari nol, rekening, tanggal/waktu.
- Opsional: kategori, merchant/sumber, catatan, tag, lampiran, lokasi, anggota.
- Tombol simpan menunjukkan dampak: “Simpan pengeluaran Rp125.000 dari BCA”.
- Setelah simpan: toast dengan **Urungkan** selama 5 detik dan shortcut “Tambah lagi”.

### 7.2 Voice Entry (F08)

`Tambah → Bicara → Izin kontekstual → Rekam → Parsing → Konfirmasi field → Simpan`

- State mikrofon: siap, mendengarkan, memproses, perlu klarifikasi, gagal, izin ditolak.
- UI menampilkan durasi dan tombol stop; getaran pendek menandai mulai/berhenti.
- Hasil menampilkan field terpisah: jenis, nominal, rekening, kategori, tanggal, catatan.
- Field dengan keyakinan rendah diberi outline dan pertanyaan tunggal, misalnya “Dari rekening mana?”.
- Transkrip mentah tidak disimpan setelah draf terstruktur terbentuk kecuali pengguna memilih menyimpannya.
- Tidak ada transaksi yang diposting hanya berdasarkan suara; pengguna selalu menekan **Konfirmasi & simpan**.

### 7.3 Receipt Scan (F07)

`Tambah → Scan struk → Izin kontekstual → Ambil/pilih foto → Crop → OCR → Review → Cek duplikat → Simpan`

- Kamera memberi panduan tepi, blur, cahaya, dan jumlah halaman.
- Hasil memisahkan merchant, tanggal, total, pajak/diskon, mata uang, serta item.
- Nilai total dibandingkan dengan jumlah item; selisih terlihat dan tidak dikoreksi diam-diam.
- Duplikat diperiksa menggunakan hash file, waktu, merchant ternormalisasi, dan nominal di domain transaksi—tanpa mengirim data itu sebagai analytics.
- Foto asli default dihapus setelah ekstraksi dan sinkronisasi selesai; pengguna dapat memilih menyimpannya sebagai lampiran terenkripsi.
- Review adalah wajib sebelum saldo berubah.

### 7.4 Transfer dan split (F06)

`Tambah → Transfer → Dari → Ke → Nominal → Biaya/kurs → Review dua sisi → Simpan`

- Rekening asal dan tujuan tidak boleh sama.
- Transfer membuat pasangan entri tertaut, bukan pemasukan dan pengeluaran independen.
- Split menampilkan indikator jumlah dialokasikan vs nominal total dan tidak dapat disimpan jika tidak seimbang.

## 8. Pola State Global

### 8.1 Empty state

Setiap empty state terdiri dari judul faktual, manfaat, satu aksi utama, dan maksimum satu aksi sekunder.

| Konteks | Pesan | Aksi utama |
|---|---|---|
| Belum ada transaksi | “Belum ada aktivitas di periode ini.” | Tambah transaksi |
| Pencarian tanpa hasil | “Tidak ada hasil untuk filter ini.” | Hapus filter |
| Belum ada anggaran | “Atur batas agar pengeluaran lebih terarah.” | Buat anggaran |
| Belum ada rekening tersinkron | “Hubungkan rekening atau catat manual.” | Pilih metode |
| Belum ada anggota | “Kelola keuangan bersama tanpa mencampur data pribadi.” | Undang anggota |

Empty state tidak boleh menggunakan rasa bersalah, ketakutan, atau ilustrasi yang menyamarkan aksi utama.

### 8.2 Loading state

- Gunakan skeleton yang mengikuti bentuk konten untuk beban lebih dari 300 ms.
- Jangan skeleton-kan saldo dengan angka palsu; gunakan blok netral.
- Pull-to-refresh mempertahankan data lama dan menunjukkan waktu sinkronisasi terakhir.
- Proses OCR, impor, ekspor, dan backup memakai progress determinate bila ukuran pekerjaan diketahui.
- Tombol yang sedang mengirim menjadi disabled dengan label progres, tetapi navigasi keluar tetap tersedia bila pekerjaan berjalan di background.

### 8.3 Offline dan sinkronisasi

- Banner persisten: “Offline—perubahan disimpan di perangkat.”
- Objek lokal diberi status `Tersimpan di perangkat`, `Menunggu sinkronisasi`, `Tersinkron`, atau `Perlu tindakan`.
- Operasi server-only—Google login baru, bank sync, undangan, dan ekspor cloud—dijelaskan serta dapat diantrikan jika aman.
- Konflik tidak ditimpa otomatis untuk nominal, rekening, tanggal, dan status rekonsiliasi. Layar membandingkan versi perangkat dan server.
- Retry memakai idempotency key; mengetuk berulang tidak boleh membuat transaksi duplikat.

### 8.4 Error state

- Inline error berada tepat di bawah field dan dibacakan screen reader.
- Error layar penuh hanya untuk kegagalan yang menghalangi seluruh tujuan layar.
- Pesan menjawab: apa yang gagal, apakah data aman, dan tindakan berikutnya.
- ID dukungan dapat disalin, tetapi tidak mengandung token, email, nominal, transkrip, atau isi struk.
- Untuk aksi destruktif yang gagal sebagian, tampilkan hasil per item dan jangan mengklaim semuanya berhasil.

### 8.5 Sensitive-number privacy state

- Toggle privacy tersedia di header Beranda, Laporan, dan switcher aplikasi; opsi global berada di F24.
- Saat aktif, seluruh nominal, saldo, net worth, label grafik, widget, notifikasi, recent-app snapshot, dan accessibility label diganti `••••` atau deskripsi “Nominal disembunyikan”.
- Kategori, tanggal, dan nama rekening tetap tampil kecuali pengguna memilih mode **Sembunyikan semua detail**.
- Screenshot blocking dapat diaktifkan di Android; iOS menggunakan privacy overlay ketika app masuk background.
- Reveal sementara memerlukan tahan 600 ms atau biometrik sesuai pengaturan, lalu tersembunyi lagi setelah 30 detik atau ketika app tidak aktif.

### 8.6 Permission state

- Kamera, mikrofon, notifikasi, biometrik, dan foto diminta tepat saat manfaat digunakan.
- Primer menjelaskan data yang diakses, tujuan, durasi penyimpanan, serta alternatif tanpa izin.
- Setelah penolakan pertama, tetap sediakan metode manual.
- Setelah “Jangan tanya lagi”, gunakan tombol **Buka Pengaturan**, bukan memicu prompt berulang.

### 8.7 Account deletion state

- Day 0: pengguna melakukan recent authentication, melihat scope penghapusan, lalu mengonfirmasi. Semua session lain dicabut dan akun masuk grace period 7 hari.
- Day 0–7: app hanya membuka layar status penghapusan, tanggal purge, ekspor yang sudah disiapkan, bantuan, dan **Batalkan penghapusan**; pembatalan memerlukan autentikasi ulang.
- Day 7: data aktif pribadi dipurge. Data household yang secara sah tetap dibutuhkan anggota lain dilepas dari identitas pengguna sesuai aturan kepemilikan, bukan disalin ke ruang pribadi.
- Backup tidak boleh memulihkan akun yang telah dipurge ke sistem aktif dan harus aging out paling lambat Day 30 sejak original deletion request.
- Analytics tertaut mengikuti lifecycle penghapusan pada `08-analytics-measurement.md`; audit keamanan minimum dipseudonimkan dan mengikuti retensi keamanan.

## 9. Objek dan Hubungan Utama

```text
User ──< Membership >── Space
Space ──< Account ──< Transaction >── Category
                    ├── TransferLink
                    ├── Split
                    ├── Receipt
                    └── ReviewState
Space ──< Budget ──< BudgetPeriod
Space ──< Goal ──< Contribution
Space ──< RecurringRule ──< Occurrence
Space ──< Debt ──< Repayment
Space ──< InstitutionConnection ──< SyncedAccount
```

Aturan relasi:

- Penghapusan kategori memerlukan kategori pengganti atau mengubah transaksi menjadi “Belum dikategorikan”.
- Rekening yang memiliki transaksi hanya dapat diarsipkan, bukan dihapus permanen dari UI biasa.
- Transaksi hasil aturan, OCR, voice, AI, impor, atau bank sync menyimpan `source` dan `confidence/status`.
- Laporan membaca transaksi `posted`; draf dan transaksi yang ditolak tidak memengaruhi angka.

## 10. Search, Filter, dan Review

- Search mendukung merchant/sumber, catatan, kategori, tag, rekening, dan ID transaksi; pencarian nominal hanya diproses lokal/server domain dan tidak masuk telemetry.
- Filter standar: periode, jenis, rekening, kategori, tag, sumber, status review, sinkronisasi, anggota, mata uang.
- Filter aktif tampil sebagai chip yang dapat dihapus satu per satu dan tersedia aksi **Reset**.
- Review queue memprioritaskan duplikat, konflik saldo, transaksi belum dikategorikan, keyakinan OCR/voice rendah, dan anomali koneksi.
- Bulk action tidak tersedia untuk menghapus; bulk categorization selalu menampilkan jumlah item dan undo.

## 11. Notifikasi, Widget, dan Deep Link

- Notifikasi tidak menampilkan nominal atau merchant pada lock screen secara default.
- Setiap notifikasi menuju objek atau tindakan yang tepat, bukan sekadar Beranda.
- Widget default memakai privacy mode sampai perangkat dibuka setidaknya sekali setelah reboot.
- Shortcut Quick Add menghormati ruang terakhir, tetapi menampilkan nama ruang sebelum simpan.
- Deep link kadaluwarsa atau sudah diselesaikan membuka status final dan jalur kembali yang jelas.

## 12. Aksesibilitas Navigasi

- Urutan fokus mengikuti urutan visual dan tidak melompat ke elemen dekoratif.
- Tab mengumumkan label, posisi, state terpilih, dan badge tanpa mengandalkan warna.
- Semua gesture swipe/drag memiliki alternatif tap.
- Ukuran teks sampai 200% tidak menghilangkan tombol utama; layar menjadi scrollable bila perlu.
- Orientasi potret dan lanskap didukung untuk laporan/tablet; kamera boleh mengunci orientasi selama capture dengan kontrol rotasi hasil.
- Setelah modal ditutup, fokus kembali ke pemicu semula.

## 13. Acceptance Criteria IA

- Seluruh F01–F24 memiliki entry point dan inventaris layar yang jelas.
- Pengguna dapat membuat transaksi manual dari setiap tab dalam maksimum dua tap sebelum input nominal.
- Voice dan receipt tidak pernah memengaruhi saldo tanpa review eksplisit.
- Semua layar utama mempunyai empty, loading, offline, error, dan privacy state yang relevan.
- Hak akses diuji pada ruang pribadi dan seluruh peran rumah tangga.
- Deep link, Back, state restoration, dan perubahan belum disimpan memiliki perilaku deterministik.
- Navigation tree dapat dipakai Design untuk prototipe dan Engineering untuk route registry tanpa menafsirkan ulang nama fitur.

## 14. Rujukan

- W3C, *Guidance on Applying WCAG 2.2 to Mobile Applications*: https://www.w3.org/TR/wcag2mobile-22/
- OWASP MASVS Privacy: https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-1/
- Expo Updates runtime compatibility: https://docs.expo.dev/eas-update/runtime-versions/
