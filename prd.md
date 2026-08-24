# Product Requirements Document (PRD) — FinanceApp

## 1. Kontrol dokumen

| Atribut | Nilai |
|---|---|
| Nama produk sementara | FinanceApp |
| Jenis produk | Aplikasi pencatatan dan perencanaan keuangan pribadi/rumah tangga |
| Platform | iOS dan Android |
| Versi dokumen | 1.0 |
| Status | Baseline siap eksekusi; keputusan default berlaku sampai Product Owner menggantinya secara tertulis |
| Tanggal baseline | 24 Agustus 2026 |
| Bahasa dokumen | Bahasa Indonesia |
| Pasar awal | Indonesia-first, global-ready |
| Pemilik keputusan produk | Product Owner FinanceApp |
| Klasifikasi data | Sangat sensitif — data keuangan pribadi |

### 1.1 Tujuan dokumen

Dokumen ini menjadi sumber kebenaran utama untuk scope, perilaku produk, prioritas, aturan bisnis, kualitas, keamanan, dan gate rilis FinanceApp. Dokumen turunan per fitur harus merujuk ID fitur dan requirement di sini. Bila ada konflik, keputusan terbaru yang disetujui Product Owner dan dicatat pada kontrol dokumen menjadi acuan.

### 1.2 Definisi fase

| Fase | Tujuan | Kriteria umum |
|---|---|---|
| Phase 0 — Foundation | Fondasi produk, teknis, desain, delivery, serta validasi risiko tertinggi | Internal; architecture baseline, design system, data model, threat model, CI/CD, observability aman, dan spike risiko selesai |
| Phase 1 — Core Ledger Private Alpha | Ledger pribadi yang aman dan dapat dipercaya untuk pencatatan manual | Private alpha; F01–F06, F16 dasar, F18 dasar, dan F24 dasar lulus integritas serta security gate |
| Phase 2 — Capture & Daily Value Beta | Input rendah friksi dan manfaat harian yang terlihat | Beta; F07–F09, F11 dasar, F13 inti, serta notifikasi F19 tersedia dengan konfirmasi manusia |
| Phase 3 — Planning & Understanding | Pemahaman historis dan perencanaan keuangan yang lengkap | F10–F15 serta F16 lengkap lulus validasi formula, drill-down, dan usability |
| Phase 4 — Collaboration & Global | Portabilitas, multi-currency, kolaborasi, dan kesiapan global/GA | F17, F20, F23, hardening F18/F24, serta widget/shortcut F19 lulus isolation, localization, dan release gate |
| Phase 5 — Optional Intelligence & Connectivity | Intelligence dan konektivitas opsional yang tidak menjadi prasyarat core product | F21 dan F22 dirilis independen hanya setelah consent, safety, legal, partner, dan unit-economics gate masing-masing lulus |

## 2. Ringkasan eksekutif

FinanceApp adalah aplikasi mobile privat untuk mencatat, memahami, dan merencanakan keuangan pribadi dengan friksi serendah mungkin. Pengguna dapat mencatat transaksi secara manual, memindai struk, atau berbicara dalam Bahasa Indonesia; hasil OCR dan suara selalu menjadi draft yang harus dikonfirmasi sebelum tersimpan sebagai transaksi final. Dashboard, anggaran, tujuan tabungan, tagihan berulang, utang/piutang, laporan, dan forecast mengubah catatan tersebut menjadi gambaran keuangan yang mudah dipahami.

Produk dibangun Indonesia-first: Bahasa Indonesia, IDR, format lokal, dan zona waktu `Asia/Jakarta` menjadi default. Arsitektur tetap global-ready melalui lokalisasi, mata uang ISO 4217, zona waktu per pengguna, dan pemisahan nilai asli dari nilai konversi.

Stack baseline adalah Expo SDK 56, React Native, TypeScript strict, Expo Router, EAS Build, dan EAS Update. Backend menggunakan Supabase Postgres, Auth, Storage, Realtime, dan Edge Functions. Google adalah login utama; Sign in with Apple tersedia dengan kedudukan setara pada iOS. FinanceApp bukan bank, alat pembayaran, broker/trading, pemberi pinjaman, ataupun penasihat keuangan.

## 3. Masalah dan peluang

### 3.1 Masalah pengguna

- Pencatatan manual terasa lambat sehingga transaksi kecil sering terlupakan.
- Data tersebar di rekening, e-wallet, struk, catatan, dan ingatan tanpa satu gambaran yang konsisten.
- Aplikasi keuangan sering terlalu rumit, terlalu dingin secara visual, atau meminta akses data lebih luas daripada kebutuhan pengguna.
- Ringkasan historis saja tidak cukup; pengguna perlu tahu batas belanja, kewajiban mendatang, dan kemungkinan saldo ke depan.
- Pengguna Indonesia membutuhkan pemahaman Bahasa Indonesia, IDR, pola pengeluaran lokal, dan input suara yang natural.
- Pasangan/keluarga membutuhkan pencatatan bersama tanpa kehilangan ruang keuangan pribadi dan kontrol akses.

### 3.2 Peluang

Menyatukan tiga cara input—manual, struk, dan suara—dengan pengalaman konfirmasi yang aman dapat meningkatkan konsistensi pencatatan. Lapisan perencanaan dan insight yang transparan kemudian memberi nilai rutin tanpa mengambil keputusan finansial atas nama pengguna.

## 4. Pengguna sasaran, persona, dan JTBD

### 4.1 Persona utama

1. **Rani — profesional muda.** Memiliki gaji bulanan, beberapa e-wallet, dan ingin tahu ke mana uang habis tanpa mengisi formulir panjang.
2. **Dimas — freelancer.** Pemasukan tidak tetap, perlu memisahkan sumber pendapatan, mengantisipasi tagihan, dan melihat runway kas.
3. **Ayu & Reza — pasangan/rumah tangga.** Membagi pengeluaran bersama, memiliki target bersama, tetapi tetap membutuhkan akun pribadi dan izin yang jelas.
4. **Maya — pengguna sadar privasi.** Menginginkan ekspor dan penghapusan data, autentikasi kuat, serta transparansi sebelum data diproses AI.

### 4.2 Jobs to be Done

- Ketika selesai bertransaksi, saya ingin mencatat dalam hitungan detik supaya data tidak hilang dari ingatan.
- Ketika menerima struk, saya ingin aplikasi mengekstrak detailnya dan meminta saya memeriksa hasilnya supaya pencatatan cepat tetapi tetap akurat.
- Ketika tangan sedang sibuk, saya ingin berkata “keluar 45 ribu untuk makan siang pakai GoPay” dan mengonfirmasinya sebelum tersimpan.
- Ketika membuka aplikasi, saya ingin langsung memahami saldo, arus kas, anggaran, dan tagihan terdekat tanpa membaca tabel rumit.
- Ketika merencanakan bulan depan, saya ingin melihat forecast berbasis data dan asumsi yang dapat dijelaskan, bukan ramalan yang tampak pasti.
- Ketika mengatur keuangan bersama, saya ingin berbagi data tertentu dengan orang yang saya pilih tanpa membuka semua data pribadi.
- Ketika berhenti menggunakan layanan, saya ingin mengekspor dan menghapus data saya secara mudah.

## 5. Prinsip produk

1. **Privat secara default.** Akses minimum, persetujuan eksplisit, dan tidak menjual data keuangan.
2. **Manusia mengonfirmasi otomatisasi.** OCR, suara, impor, dan AI tidak boleh menciptakan transaksi final tanpa kontrol pengguna.
3. **Cepat untuk tugas harian, dalam bila dibutuhkan.** Aksi utama dapat selesai dengan sedikit langkah; detail lanjutan bersifat progresif.
4. **Angka harus dapat dipercaya.** Saldo, transfer, mata uang, sinkronisasi, dan pembulatan mengikuti aturan deterministik dan dapat diaudit.
5. **Insight dapat dijelaskan.** Tampilkan data sumber, rentang waktu, dan asumsi; hindari bahasa pasti atau saran investasi.
6. **Offline tetap berguna.** Pencatatan inti tidak bergantung pada koneksi; sinkronisasi tidak boleh menggandakan atau menghilangkan data.
7. **Hangat, tenang, dan inklusif.** Visual pastel warm cream, hierarki bersih, kontras aksesibel, dan bukan estetika yang mengorbankan keterbacaan.
8. **Indonesia-first, global-ready.** Default lokal tidak ditanam keras pada model data atau logika bisnis.

## 6. Sasaran dan non-sasaran

### 6.1 Sasaran produk

- Memungkinkan transaksi umum dicatat dalam median maksimal 15 detik.
- Menjadi sumber catatan keuangan pribadi yang konsisten lintas akun dan perangkat.
- Memberikan ringkasan yang dapat dipahami dalam satu layar dan tindakan yang jelas.
- Membantu pengguna mengendalikan anggaran, kewajiban, tujuan, dan arus kas mendatang.
- Menjaga kontrol pengguna atas data, otomatisasi, berbagi, ekspor, dan penghapusan.
- Menghadirkan pembaruan konten dan perbaikan kompatibel dengan cepat tanpa menyesatkan pengguna tentang batas OTA.

### 6.2 Non-sasaran

- Menyimpan dana, memindahkan uang, melakukan pembayaran, atau menerbitkan instrumen keuangan.
- Trading, rekomendasi investasi, credit scoring, pinjaman, penagihan, atau nasihat keuangan profesional.
- Pembukuan pajak/akuntansi bisnis yang patuh regulasi sebagai scope awal.
- Mengambil keputusan atau membuat transaksi final secara otomatis berdasarkan AI.
- Menggantikan bukti transaksi resmi, laporan bank, atau dokumen pajak.
- Web/desktop penuh tidak masuk delivery roadmap Phase 0–5; portal dukungan internal yang aman boleh dibuat bila diperlukan operasional.
- Sinkronisasi bank/e-wallet pada rilis awal.

## 7. Ruang lingkup fitur F01–F24

| ID | Fitur stand-alone | Fase | Cakupan dan hasil pengguna |
|---|---|---|---|
| F01 | Onboarding & autentikasi | Phase 0 fondasi; Phase 1 lengkap | Value proposition dan privasi singkat, login Google sebagai jalur utama, Sign in with Apple setara di iOS, consent awal, pembuatan akun pertama, logout semua perangkat, reautentikasi aksi sensitif, dan deep-link OAuth aman. |
| F02 | Profil keuangan & preferensi | Phase 1 | Nama tampilan, locale, mata uang dasar, zona waktu, awal minggu/bulan anggaran, tampilan nominal, notifikasi, dan preferensi privasi. Default Indonesia: `id-ID`, IDR, `Asia/Jakarta`. |
| F03 | Akun, dompet, aset & liabilitas | Phase 1 | Akun kas, bank, e-wallet, kartu, aset, dan liabilitas; saldo awal; tipe saldo; arsip; serta net worth tanpa penghitungan ganda. Tidak menghubungkan institusi pada fase ini. |
| F04 | Kategori, tag & aturan klasifikasi | Phase 1 | Kategori sistem yang dapat disesuaikan, subkategori, tag, merchant/payee, ikon/warna, merge/arsip, serta aturan saran berdasarkan merchant tanpa menimpa keputusan pengguna. |
| F05 | Transaksi manual | Phase 1 | Pemasukan dan pengeluaran dengan quick add, akun, nominal, merchant, kategori, tag, catatan, tanggal efektif, status, lokasi opsional, duplikasi, serta lampiran privat. |
| F06 | Transfer, split & adjustment | Phase 1 | Transfer internal berpasangan, split category, refund, koreksi saldo, biaya transfer, selisih kurs, serta preview dampak tanpa menggandakan income/expense. |
| F07 | Scan struk & OCR | Phase 2 | Ambil/unggah gambar, crop/rotate, private attachment, ekstraksi merchant–tanggal–total–pajak–item bila tersedia, confidence, deteksi duplikat, editor hasil, lalu konfirmasi eksplisit. |
| F08 | Input suara | Phase 2 | Push-to-talk Bahasa Indonesia, transkripsi lokal, parsing intent/nominal/kategori/akun/tanggal, editor hasil, konfirmasi eksplisit sebelum simpan, dan penghapusan audio lokal sesuai kebijakan retensi. |
| F09 | Dashboard & ringkasan harian | Phase 2 | Saldo/net worth ringkas, pemasukan/pengeluaran periode, arus kas, progres anggaran, tagihan dekat, tujuan, tren singkat, review prompt, serta quick actions. |
| F10 | Laporan arus kas & net worth | Phase 3 | Arus kas, spending by category/merchant/account, income, net worth, budget variance, period comparison, drill-down, metodologi, dan ekspor laporan. |
| F11 | Anggaran | Phase 2 dasar; Phase 3 lengkap | Anggaran bulanan atau custom per kategori/kelompok, rollover opsional, progres, safe-to-spend, threshold peringatan, dan carry-over transparan. |
| F12 | Tujuan & sinking funds | Phase 3 | Target nominal/tanggal, sinking fund berkala, kontribusi manual/terhubung transaksi, progres, proyeksi sederhana, reminder, pause, dan tujuan bersama. |
| F13 | Transaksi berulang, tagihan & langganan | Phase 2 inti; Phase 3 lengkap | Rule harian/mingguan/bulanan/tahunan, jatuh tempo, reminder, skip/pause, nominal variabel, deteksi subscription, serta draft atau posting otomatis pilihan pengguna. |
| F14 | Utang, piutang & pinjaman tercatat | Phase 3 | Pihak terkait, pokok, bunga/biaya informatif, jadwal cicilan/pembayaran, jatuh tempo, status, pengingat, dan histori; hanya pencatatan, bukan fasilitas pinjaman/penagihan. |
| F15 | Kalender & forecast | Phase 3 | Kalender transaksi/tagihan/tujuan dan proyeksi arus kas deterministik dari saldo, recurring, serta asumsi editable; skenario sederhana dan kelengkapan data terlihat. |
| F16 | Pencarian, review & rekonsiliasi | Phase 1 dasar; Phase 3 lengkap | Timeline, pencarian dan filter lengkap, review transaksi belum lengkap/duplikat, rekonsiliasi saldo manual, detail sumber, edit, soft delete, restore terbatas, dan jejak perubahan relevan. |
| F17 | Multi-currency | Phase 4 | Nominal asli, mata uang akun, base currency, kurs bertanggal, override manual, sumber kurs, biaya konversi, dan laporan tanpa mengubah histori asli. |
| F18 | Offline-first & sinkronisasi | Phase 0 fondasi; Phase 1 core; hardening Phase 4 | Baca snapshot, tambah/edit/hapus transaksi offline, mutation queue terenkripsi, idempotensi, retry, status sync, tombstone, dan resolusi konflik yang dapat dipahami. |
| F19 | Notifikasi, widget & shortcut | Phase 2 notifikasi; Phase 4 widget/shortcut | Reminder tagihan/anggaran/recurring/tujuan, pusat notifikasi, granular opt-in, safe deep link, widget tanpa detail sensitif default, dan shortcut Quick Add/Scan/Suara. |
| F20 | Impor, ekspor & backup pengguna | Phase 1 export dasar; Phase 4 lengkap | Impor CSV dengan mapping/preview/deduplikasi; ekspor CSV/JSON dan paket lampiran; progress, error per baris, arsip portabel, serta recovery yang tidak menggantikan backup operasional backend. |
| F21 | AI insights & assistant | Phase 5 | Ringkasan pola, anomali, peluang penghematan, dan tanya data sendiri secara read-only; opt-in, sumber/periode terlihat, feedback, batasan, dan tanpa nasihat finansial. |
| F22 | Sinkronisasi bank/e-wallet | Phase 5 | Integrasi read-only melalui partner resmi, consent granular, rekonsiliasi/deduplikasi, revoke, dan transparansi refresh. Tidak dibangun sebelum gate legal/security/partner lulus. |
| F23 | Household sharing | Phase 4 | Household, undangan, role Owner/Admin/Member/Viewer, akun/anggaran/tujuan bersama, kontribusi, aktivitas anggota, revoke, serta ruang personal yang tidak otomatis dibagikan. |
| F24 | Keamanan, privasi & kontrol akun | Phase 0 fondasi; Phase 1 controls; hardening Phase 4 | RLS, private storage, encrypted offline DB, secure token storage, biometric app lock opsional, sesi/perangkat, consent, delete account, dan privacy center. |

### 7.1 Urutan delivery

- **Phase 0 — Foundation:** design system, skema data, threat model, fondasi auth/RLS, spike OCR–suara–offline, CI/CD, dan observability yang tidak merekam data sensitif.
- **Phase 1 — Core Ledger Private Alpha:** F01–F06, F16 dasar, F18 dasar, dan F24 dasar. Fokusnya adalah ledger manual yang benar, privat, dapat direkonsiliasi, serta aman digunakan offline.
- **Phase 2 — Capture & Daily Value Beta:** F07–F09, F11 dasar, F13 inti, dan notifikasi F19. F07–F08 boleh memiliki quota beta yang diinformasikan, tetapi alur konfirmasi dan privasi tidak boleh dipangkas.
- **Phase 3 — Planning & Understanding:** F10–F15 dan F16 lengkap. F11 serta F13 diperdalam tanpa memutus perilaku yang sudah tersedia pada Phase 2.
- **Phase 4 — Collaboration & Global:** F17, F20, F23, hardening F18/F24, serta widget/shortcut F19. Fase ini menjadi baseline kesiapan GA lintas household, locale, dan skenario pemulihan.
- **Phase 5 — Optional Intelligence & Connectivity:** F21 dan F22. Keduanya opsional, tidak memblokir GA, dan memiliki gate consent, safety, legal, partner, serta biaya yang terpisah.

## 8. Pengalaman dan desain

### 8.1 Arah visual

- Minimalis, estetik, hangat, dan tidak menyerupai aplikasi trading.
- Palet dasar: warm cream/off-white; aksen pastel terracotta, sage, peach, dan dusty blue; merah/hijau tidak menjadi satu-satunya pembeda makna.
- Card dengan radius lembut, whitespace cukup, elevasi tipis, ikon sederhana, dan grafik yang tidak ramai.
- Nominal menjadi informasi utama; informasi sekunder memakai tipografi yang tetap lolos kontras.
- Mode terang menjadi default. Dark mode masuk Phase 4 tanpa mengubah semantik warna.
- Animasi singkat dan fungsional; hormati pengaturan reduced motion.

### 8.2 Navigasi default

Tab utama: **Beranda**, **Transaksi**, tombol aksi **Catat**, **Rencana**, dan **Lainnya**. Tombol Catat membuka pilihan Manual, Scan Struk, dan Suara. Pencarian tersedia dari Transaksi; Laporan, Akun, Tujuan, Utang/Piutang, Impor/Ekspor, Household, dan Pengaturan ditempatkan berdasarkan fase serta frekuensi.

### 8.3 Aksesibilitas

- Target WCAG 2.2 AA untuk kontras, label, ukuran sentuh, focus order, dan dynamic text yang relevan.
- Target sentuh minimum 44×44 pt; informasi nominal dan status memiliki label screen reader lengkap.
- Grafik memiliki ringkasan tekstual; input suara bukan satu-satunya jalur input.
- Format angka, tanggal, dan pembacaan screen reader diuji dalam Bahasa Indonesia dan Inggris.

## 9. Journey pengguna inti

### J01 — Daftar dan siap mencatat

1. Pengguna melihat value proposition dan ringkasan privasi singkat.
2. Pengguna memilih Google; pada iOS, Apple ditampilkan dengan visibilitas dan kemampuan setara.
3. OAuth memakai PKCE dan kembali ke app melalui deep link yang tervalidasi.
4. Pengguna mengatur atau menerima default IDR, `Asia/Jakarta`, dan Bahasa Indonesia.
5. Pengguna membuat akun keuangan pertama beserta saldo awal dan tanggal saldo.
6. Izin kamera, mikrofon, foto, notifikasi, dan biometrik diminta just-in-time, bukan sekaligus.
7. Beranda menampilkan empty state dengan tiga pilihan pencatatan dan contoh yang dapat dilewati.

**Selesai ketika:** sesi aman terbentuk, profil dan akun pertama tersimpan, consent tercatat, dan pengguna dapat membuka Quick Add.

### J02 — Mencatat transaksi manual

1. Pengguna menekan Catat → Manual.
2. Jenis transaksi dan nominal dapat dimasukkan lebih dulu; default tanggal adalah saat ini di zona waktu pengguna.
3. App menyarankan kategori, merchant, dan akun dari konteks tanpa mengunci pilihan.
4. Pengguna dapat menambah split, tag, catatan, atau lampiran.
5. Preview memperlihatkan dampak terhadap akun dan anggaran.
6. Pengguna menyimpan; dashboard, histori, saldo, dan anggaran diperbarui secara optimistis dengan indikator sync bila offline.

**Selesai ketika:** satu transaksi idempoten tersimpan lokal, tersinkron sekali, dan dapat ditemukan kembali.

### J03 — Scan struk sampai transaksi terkonfirmasi

1. Pengguna memilih Scan Struk dan memberi izin kamera/foto secara kontekstual.
2. App memandu crop, orientasi, kualitas cahaya, serta memberi opsi retake.
3. File dikompresi tanpa menghilangkan keterbacaan dan diproses lokal di perangkat untuk OCR Phase 2; gambar tidak diunggah sebelum transaksi dikonfirmasi dan pengguna memilih menyimpan lampiran.
4. OCR lokal menghasilkan **draft** dengan confidence per field; nominal total, merchant, tanggal, pajak, dan item ditampilkan untuk diperiksa.
5. App memberi peringatan bila mirip transaksi/struk yang sudah ada.
6. Pengguna memperbaiki field, memilih akun/kategori, lalu menekan Konfirmasi & Simpan.
7. App menyimpan hubungan transaksi–lampiran hanya bila `keep_image=true` dan menghapus bahan pemrosesan lokal sesuai retensi.

**Selesai ketika:** tidak ada transaksi final sebelum konfirmasi dan pengguna dapat melihat sumber gambar serta field yang diubah.

### J04 — Mencatat dengan suara

1. Pengguna menahan tombol mikrofon; UI menunjukkan bahwa perekaman aktif.
2. Pengguna berkata, misalnya, “Pengeluaran empat puluh lima ribu untuk makan siang dari GoPay kemarin.”
3. Transkripsi dan parser mengisi draft: jenis, Rp45.000, kategori, akun, dan tanggal.
4. Field ambigu disorot; transcript tetap dapat diedit atau input diulang.
5. Pengguna mengonfirmasi draft. Audio mentah dihapus segera setelah tujuan pemrosesan selesai, kecuali pengguna secara eksplisit ikut program peningkatan kualitas dengan periode retensi yang diinformasikan.

**Selesai ketika:** transaksi terkonfirmasi tersimpan satu kali, transcript tidak berubah diam-diam, dan kegagalan suara selalu memiliki fallback manual.

### J05 — Review mingguan dan mengendalikan anggaran

1. Pengguna membuka Beranda atau notifikasi review mingguan.
2. App menampilkan pemasukan, pengeluaran, safe-to-spend, kategori mendekati batas, tagihan dekat, dan perubahan net worth.
3. Pengguna membuka satu kategori untuk melihat transaksi penyebabnya.
4. Pengguna mengoreksi kategori atau menyesuaikan anggaran; perubahan langsung memperbarui agregat.
5. Pengguna menandai review selesai; app tidak memberi penilaian moral terhadap perilaku belanja.

### J06 — Tagihan/recurring menjadi transaksi

1. Pengguna membuat rule dengan pola, akun, kategori, nominal, tanggal mulai, dan pilihan draft atau auto-post.
2. Zona waktu rule terkunci pada zona pengguna saat dibuat dan dapat diubah eksplisit.
3. Menjelang jatuh tempo, notifikasi mengarahkan ke instance yang benar.
4. Mode default membuat draft; pengguna mengonfirmasi/ubah/skip. Auto-post hanya aktif setelah opt-in per rule.
5. Edit satu instance tidak mengubah seri kecuali pengguna memilih “instance ini dan berikutnya”.

### J07 — Mencatat offline lalu sinkron

1. Saat offline, pengguna dapat membaca snapshot terakhir dan membuat/edit/hapus transaksi.
2. Mutasi disimpan pada antrean lokal terenkripsi dengan `operation_id` unik dan status terlihat.
3. Saat online, client mengirim ulang secara idempoten; server menolak duplikasi.
4. Perubahan non-konflik digabung. Konflik pada field yang sama menampilkan versi “di perangkat ini” dan “di server” beserta waktu/aktor.
5. Pengguna memilih hasil bila merge otomatis tidak aman; audit mencatat resolusi.

### J08 — Berbagi household tanpa membuka ruang personal

1. Owner membuat household dan memilih data yang akan menjadi shared.
2. Undangan memiliki masa berlaku dan penerima harus login dengan identitas yang dituju.
3. Penerima melihat role dan scope sebelum menerima.
4. Data personal tetap personal kecuali dipindah/dibuat eksplisit pada household.
5. Revoke segera menutup akses server dan menghapus cache shared pada perangkat saat sinkron berikutnya.

### J09 — Ekspor atau hapus akun

1. Pengguna membuka Privacy Center dan melakukan reautentikasi.
2. Untuk ekspor, app membuat job, memberi status, dan menghasilkan tautan unduh signed berumur pendek.
3. Untuk penghapusan, app menjelaskan dampak pada household, transfer ownership bila perlu, dan grace period pemulihan selama 7 hari kalender.
4. Setelah konfirmasi kuat, seluruh sesi dicabut dan akun dinonaktifkan. Pengguna dapat membatalkan permintaan melalui reautentikasi selama grace period 7 hari.
5. Pada akhir hari ke-7, data aktif dipurge paling lambat 24 jam kemudian. Salinan pada backup kedaluwarsa paling lambat hari ke-30 sejak permintaan awal, kecuali penyimpanan minimum diwajibkan hukum dan diinformasikan secara spesifik.
6. Pengguna menerima bukti status tanpa isi data finansial sensitif di notifikasi.

## 10. Aturan bisnis

| ID | Aturan |
|---|---|
| BR-001 | Semua nilai uang disimpan sebagai integer minor unit beserta kode mata uang ISO 4217; tidak memakai floating point untuk perhitungan uang. |
| BR-002 | `occurred_at`, zona waktu asal, dan tanggal lokal transaksi disimpan sehingga perubahan zona waktu tidak menggeser histori secara ambigu. |
| BR-003 | Saldo akun = saldo awal + transaksi posted yang memengaruhi akun; draft dan transaksi terhapus tidak dihitung. |
| BR-004 | Transfer internal terdiri dari dua sisi dengan satu `transfer_group_id`; nilainya tidak dihitung sebagai pemasukan/pengeluaran agregat. Selisih kurs/biaya dicatat eksplisit. |
| BR-005 | Refund mengurangi pengeluaran kategori terkait pada periode refund dan tetap menaut ke transaksi asal bila tersedia. Kebijakan laporan historis ditampilkan konsisten. |
| BR-006 | Split transaction wajib berjumlah tepat sama dengan total transaksi setelah pembulatan minor unit; selisih pembulatan ditempatkan secara deterministik pada split terbesar dan terlihat. |
| BR-007 | Draft hasil OCR, suara, impor, dan recurring default tidak memengaruhi saldo sampai dikonfirmasi atau rule auto-post yang eksplisit berjalan. |
| BR-008 | Kategori/akun yang pernah dipakai diarsipkan, bukan dihapus keras, agar histori tetap utuh. |
| BR-009 | Satu mutasi client memiliki `operation_id` yang unik; retry tidak boleh membuat duplikat. |
| BR-010 | Soft delete transaksi dapat dipulihkan selama 30 hari; setelah itu masuk proses penghapusan permanen sesuai retensi dan kebutuhan audit keamanan minimum. |
| BR-011 | Anggaran memakai kalender lokal pengguna. Default periode adalah tanggal 1 sampai akhir bulan; rollover nonaktif kecuali diaktifkan per anggaran. |
| BR-012 | Safe-to-spend menggunakan saldo likuid, kewajiban terjadwal, dan sisa anggaran; formula dan komponen selalu dapat dibuka pengguna. |
| BR-013 | Kurs tersimpan bersama tanggal, sumber, dan nilai yang dipakai. Perubahan kurs terbaru tidak menulis ulang angka historis yang telah dilaporkan. |
| BR-014 | Forecast adalah simulasi, bukan janji. Data aktual, recurring, asumsi manual, dan hasil proyeksi harus dapat dibedakan. |
| BR-015 | Owner data adalah user atau household. Akses shared hanya diberikan melalui membership aktif dan role; mengetahui ID objek tidak pernah cukup. |
| BR-016 | Viewer read-only; Member dapat mengelola transaksi shared; Admin mengelola data dan anggota selain ownership; Owner mengelola ownership dan penghapusan household. |
| BR-017 | AI hanya membaca scope yang disetujui, tidak mengeksekusi transaksi, tidak mengubah data tanpa aksi eksplisit, dan tidak memberi rekomendasi investasi/kredit. |
| BR-018 | Saran kategori/merchant tidak boleh menimpa pilihan pengguna. Koreksi pengguna menjadi sinyal personal hanya setelah consent yang sesuai. |
| BR-019 | Notifikasi lock screen tidak menampilkan nominal atau merchant secara default; pengguna dapat mengubah tingkat detail. |
| BR-020 | Sinkronisasi bank/e-wallet kelak bersifat read-only; transaksi impor direkonsiliasi agar tidak menggandakan catatan manual/OCR. |

## 11. Arsitektur dan model data tingkat produk

### 11.1 Stack keputusan

- **Client:** Expo SDK 56, React Native, TypeScript strict, Expo Router.
- **Build & distribusi:** EAS Build untuk binary, EAS Submit untuk store workflow, EAS Update untuk JS/assets yang kompatibel dengan runtime.
- **Backend:** Supabase Postgres, Auth, Storage private bucket, Realtime untuk perubahan terotorisasi, dan Edge Functions untuk operasi berprivilege/integrasi vendor.
- **State & data:** server state ter-cache, UI state terpisah, validasi schema pada boundary, serta SQLite lokal terenkripsi untuk snapshot dan mutation queue.
- **Token:** refresh/access token hanya di secure OS keystore melalui secure storage; tidak di AsyncStorage, log, analytics property, atau URL.
- **Konfigurasi:** secret hanya pada environment server/build yang sesuai; service-role key tidak pernah masuk bundle client.

### 11.2 Entitas inti

Registry exhaustif seluruh tabel server fisik, owner fitur, fase, dan klasifikasi source-of-truth/derived berada di `docs/04-data-model.md` §1.1; artefak local-only, view, dan tabel platform-managed berada di §1.2. Migration tidak boleh memperkenalkan nama di luar registry. `financial_entries` + `entry_splits` adalah satu-satunya canonical ledger; extension Phase 1–5 hanya boleh menjadi reference, relasi, workflow, audit, staging, atau proyeksi yang dapat dihitung ulang.

`financial_entries` adalah satu-satunya source of truth ledger. Transfer, split, adjustment, refund, recurring occurrence, OCR, voice, impor, dashboard, laporan, forecast, dan rekonsiliasi harus menghasilkan atau membaca entry melalui model ini; tabel lain hanya menyimpan detail, relasi, workflow, deduplikasi, atau proyeksi dan tidak boleh membentuk ledger paralel.

Setiap row finansial memiliki owner scope (`user_id` atau `household_id`), waktu create/update, version untuk conflict handling, serta soft-delete metadata bila relevan. RLS aktif pada setiap tabel schema yang dapat diakses client. Storage path tidak menjadi mekanisme otorisasi tunggal; akses diverifikasi lewat policy dan signed URL.

### 11.3 Batas jenis pembaruan

| Jenis perubahan | Dapat muncul tanpa update store? | Mekanisme dan batas |
|---|---|---|
| Konten/data | Ya | Data transaksi, kategori server, insight, kurs, copy CMS yang aman, dan status akun dapat berubah dari backend sesuai otorisasi. Ini bukan perubahan executable app. |
| Remote config | Ya, bila perilakunya sudah ada di binary | Feature flag, quota, urutan modul, threshold, dan copy dapat dikendalikan server. Remote config tidak boleh mengunduh kode native/JS baru, melewati consent, atau melemahkan keamanan. |
| OTA JS/assets | Ya, dalam batas kebijakan dan kompatibilitas runtime | EAS Update mengirim JavaScript dan asset ke channel yang sesuai `runtimeVersion`. Update diunduh aman, diterapkan pada launch yang aman, dipantau, dan dapat di-roll back. Tidak boleh dipakai untuk perubahan native atau untuk mengakali review store. |
| Binary/native | Tidak; perlu rilis App Store/Play Store | Perubahan Expo SDK, native module/plugin, entitlement, permission native, konfigurasi signing, atau native code wajib melalui EAS Build dan review store. Pengguna tetap bergantung pada mekanisme update store/auto-update OS. |

Pengalaman “konten selalu segar” seperti aplikasi modern terutama dicapai melalui data server dan remote config; FinanceApp tidak menjanjikan seluruh jenis perubahan dapat diterapkan tanpa pembaruan binary.

## 12. Functional requirements

### 12.1 Identitas dan akses

- **FR-AUTH-001:** Pengguna dapat membuat/masuk akun melalui Google di iOS dan Android.
- **FR-AUTH-002:** Pengguna iOS mendapat Sign in with Apple dengan cakupan fungsi setara Google.
- **FR-AUTH-003:** OAuth memakai PKCE, state/nonce, allowlist redirect URI, dan penanganan cancel/error tanpa membuat akun parsial.
- **FR-AUTH-004:** Pengguna dapat melihat dan mencabut sesi perangkat; aksi export, delete, dan transfer ownership meminta reautentikasi.
- **FR-AUTH-005:** RLS menolak akses lintas user/household untuk seluruh operasi select/insert/update/delete yang tidak sah.

### 12.2 Pencatatan dan data keuangan

- **FR-TXN-001:** Pengguna dapat membuat, melihat, mengubah, soft-delete, dan memulihkan transaksi pemasukan/pengeluaran.
- **FR-TXN-002:** Sistem mendukung transfer berpasangan, split transaction, refund, tag, merchant, catatan, lokasi opsional, dan lampiran.
- **FR-TXN-003:** Semua perubahan transaksi memperbarui saldo, anggaran, dashboard, laporan, dan forecast secara konsisten.
- **FR-TXN-004:** Sistem mendeteksi kandidat duplikat dari nominal, waktu, akun, merchant, dan fingerprint lampiran tanpa menghapus otomatis.
- **FR-TXN-005:** Pengguna dapat mencari dan memfilter seluruh histori yang diizinkan, termasuk drill-down dari agregat.

### 12.3 OCR dan suara

- **FR-CAP-001:** OCR menerima kamera atau file gambar, menyediakan crop/rotate/retake, dan menampilkan progress/error yang dapat ditindaklanjuti.
- **FR-CAP-002:** Hasil OCR menampilkan confidence/ambiguity per field penting dan tidak menjadi posted transaction sebelum konfirmasi pengguna.
- **FR-CAP-003:** Voice input mendukung utterance Bahasa Indonesia untuk jenis, nominal, kategori/merchant, akun, dan waktu relatif umum.
- **FR-CAP-004:** Transcript dan setiap field hasil parsing dapat diedit; app meminta klarifikasi visual untuk field wajib yang ambigu.
- **FR-CAP-005:** Pengguna dapat menghapus lampiran dan bahan input; Phase 2 tidak menyimpan audio mentah, transcript mentah, gambar struk sementara, atau raw OCR di server, dan bahan lokal dihapus saat confirm/cancel/timeout.

### 12.4 Perencanaan dan insight

- **FR-PLAN-001:** Pengguna dapat membuat anggaran dengan periode, scope kategori, nominal, threshold, dan rollover opsional.
- **FR-PLAN-002:** Pengguna dapat membuat recurring rule, melihat instance mendatang, pause/skip, dan memilih draft atau auto-post per rule.
- **FR-PLAN-003:** Pengguna dapat mengelola tujuan, kontribusi, utang/piutang, cicilan, dan reminder tanpa fungsi pembayaran.
- **FR-PLAN-004:** Laporan selalu menyediakan periode, filter, formula/metodologi ringkas, drill-down, dan nilai mata uang yang jelas.
- **FR-PLAN-005:** Forecast memisahkan fakta, transaksi terjadwal, dan asumsi pengguna serta memungkinkan skenario diedit/reset.
- **FR-AI-001:** AI insights bersifat opt-in, read-only, mengutip periode/kategori/data agregat pendukung, dan menyediakan feedback salah/tidak berguna.
- **FR-AI-002:** AI menolak permintaan untuk mentransfer uang, melakukan trading, atau memberikan rekomendasi finansial personal yang diatur.

### 12.5 Offline, kolaborasi, dan portabilitas

- **FR-SYNC-001:** Pengguna dapat membuat/edit/hapus transaksi saat offline dan melihat status pending/failed/synced.
- **FR-SYNC-002:** Setiap retry sinkron idempoten; kegagalan parsial tidak menyebabkan kehilangan atau duplikasi transaksi.
- **FR-SYNC-003:** Konflik field yang tidak aman digabung otomatis harus ditampilkan untuk resolusi pengguna dengan kedua versi tersedia.
- **FR-SHARE-001:** Household menerapkan Owner/Admin/Member/Viewer dan data personal tidak berpindah menjadi shared tanpa aksi eksplisit.
- **FR-SHARE-002:** Revoke membership menghentikan akses server segera dan memicu pembersihan cache shared pada device.
- **FR-PORT-001:** Impor CSV memiliki mapping, preview, validasi, deduplikasi, dan laporan sukses/gagal per row sebelum commit final.
- **FR-PORT-002:** Pengguna dapat mengekspor data dalam format machine-readable dan mengunduh lampiran melalui link sementara setelah reautentikasi.
- **FR-PORT-003:** Pengguna dapat menghapus akun dari dalam app; sistem mencabut sesi dan memenuhi jadwal penghapusan yang ditampilkan.

### 12.6 Notifikasi, lokal, dan update

- **FR-SYS-001:** Pengguna mengatur notifikasi per tipe, quiet hours, dan tingkat detail lock screen; security alert wajib tidak dapat dimatikan seluruhnya.
- **FR-SYS-002:** Seluruh nominal menggunakan formatter locale/mata uang; data asli tidak hilang saat base currency berubah.
- **FR-SYS-003:** EAS Update hanya diterapkan pada runtime compatible, memiliki channel per environment, integrity verification, telemetry keberhasilan, dan rollback plan.
- **FR-SYS-004:** App memberi pesan “perlu update dari store” ketika minimum supported binary dinaikkan karena keamanan/kompatibilitas.
- **FR-SYS-005:** Remote config memiliki schema/version, safe defaults pada kegagalan jaringan, audit perubahan, dan tidak dapat menonaktifkan kontrol keamanan wajib.

## 13. Non-functional requirements

### 13.1 Keamanan dan privasi

- **NFR-SEC-001:** Seluruh trafik memakai TLS; token berada di OS secure storage; SQLite lokal dan mutation queue dienkripsi at rest.
- **NFR-SEC-002:** Semua tabel client-facing memiliki RLS dan test allow/deny otomatis untuk user, household role, revoked member, dan unauthenticated actor.
- **NFR-SEC-003:** Semua bucket finansial bersifat private; signed URL memiliki masa berlaku maksimal 10 menit dan tidak dicatat di analytics/log.
- **NFR-SEC-004:** Service-role credential dan secret vendor hanya tersedia server-side; secret scanning dan dependency scanning wajib di CI.
- **NFR-SEC-005:** Log, crash report, analytics, dan trace meredaksi nominal, catatan, transcript, image, token, email, signed URL, serta ID eksternal sensitif.
- **NFR-SEC-006:** Edge Functions menerapkan autentikasi, validasi schema, authorization ulang, rate limit, ukuran file, MIME sniffing, dan timeout.
- **NFR-SEC-007:** Threat model mengikuti OWASP MASVS/ASVS yang relevan dan diuji ulang sebelum setiap major release.
- **NFR-PRV-001:** Consent OCR/voice/AI/analytics terpisah sesuai tujuan dan dapat ditarik tanpa kehilangan fitur manual.
- **NFR-PRV-002:** Pengumpulan data mengikuti minimisasi; data tidak dijual dan tidak dipakai melatih model lintas pelanggan tanpa opt-in terpisah.
- **NFR-PRV-003:** Privacy policy menjelaskan processor, lokasi/transfer data, retensi, hak akses/ekspor/hapus, dan kanal insiden dalam bahasa yang jelas.

### 13.2 Reliabilitas, performa, dan skala

- **NFR-REL-001:** Target crash-free sessions minimal 99,7% pada beta dan 99,9% sebelum scale publik.
- **NFR-REL-002:** Target keberhasilan sinkronisasi mutasi minimal 99,5% dalam 5 menit setelah koneksi stabil; kehilangan data terkonfirmasi adalah zero-tolerance incident.
- **NFR-REL-003:** Backup backend harian dan point-in-time recovery dikonfigurasi sesuai plan; latihan restore dilakukan minimal per kuartal.
- **NFR-PERF-001:** Cold start p75 maksimal 2,5 detik dan warm start p75 maksimal 1 detik pada perangkat target menengah dengan snapshot lokal.
- **NFR-PERF-002:** Interaksi lokal utama memberi respons visual maksimal 100 ms; layar histori pertama tampil p75 maksimal 1,5 detik dari cache.
- **NFR-PERF-003:** API non-AI/non-upload p95 maksimal 800 ms dari Indonesia pada kondisi normal; OCR p95 maksimal 8 detik untuk struk satu halaman yang didukung.
- **NFR-SCL-001:** Pagination cursor digunakan untuk histori; agregat besar dihitung server-side/materialized sesuai profiling dan tidak mengunduh seluruh transaksi ke layar.

### 13.3 Kualitas, aksesibilitas, dan kompatibilitas

- **NFR-QLT-001:** TypeScript strict tanpa suppression global; schema divalidasi pada client/server boundary; migration database versioned dan dapat diuji ulang.
- **NFR-QLT-002:** Perhitungan uang, transfer, split, recurrence, timezone, kurs, RLS, dan idempotensi memiliki automated test sebagai gate CI.
- **NFR-ACC-001:** Seluruh alur yang masuk pada setiap delivery phase lolos audit WCAG 2.2 AA yang relevan, screen reader, dynamic type, contrast, reduced motion, dan target sentuh sebelum phase tersebut ditutup.
- **NFR-COMP-001:** Baseline dukungan adalah iOS 16+ dan Android 10/API 29+; matriks device mencakup layar kecil, perangkat menengah, dan versi OS minimum/current.
- **NFR-LOC-001:** Copy tidak di-hardcode pada komponen; Bahasa Indonesia lengkap sejak Phase 1 dan Inggris lengkap sebelum Phase 4 ditutup.
- **NFR-OPS-001:** Observability mencakup crash, latency, sync queue, job OCR/voice, auth failure, dan OTA adoption tanpa payload finansial.
- **NFR-OPS-002:** Incident severity, on-call owner, rollback OTA/binary/backend, dan komunikasi insiden terdokumentasi sebelum beta eksternal.

## 14. Pengukuran keberhasilan

### 14.1 North-star metric

**Weekly Financially Active Users (WFAU):** pengguna yang dalam 7 hari mengonfirmasi minimal 5 transaksi dan membuka sekurangnya satu ringkasan, anggaran, laporan, atau forecast. Target beta 90 hari: minimal 40% dari weekly active users memenuhi definisi WFAU.

### 14.2 Definisi denominator dan jendela

- **Onboarding completion:** user baru yang menyelesaikan profil minimum dan membuat akun/dompet pertama dibagi user baru yang membuka langkah pertama onboarding setelah auth; cohort mingguan dan rolling 28 hari.
- **Activation 24h:** user baru yang dalam 24 jam setelah auth menyelesaikan tiga aksi—membuat akun/dompet, mengonfirmasi transaksi pertama, dan membuka ringkasan—dibagi seluruh user baru yang berhasil auth; cohort mingguan.
- **WAU/MAU:** unique user yang melakukan minimal satu meaningful action dalam 7 hari terakhir dibagi unique user yang melakukan meaningful action dalam 30 hari terakhir, dihitung harian. Meaningful action adalah mengonfirmasi/mengedit transaksi, menyelesaikan review, atau membuka dashboard/laporan/anggaran/forecast; sekadar membuka app atau menerima push tidak dihitung.
- **D30 retained:** user dari cohort activation yang melakukan meaningful action pada hari ke-27 sampai ke-33 dibagi seluruh activated user pada cohort tersebut; dilaporkan per cohort mingguan setelah window lengkap.
- **Quick-add completion:** attempt yang menghasilkan transaksi terkonfirmasi maksimal 24 jam setelah dimulai dibagi attempt eligible. Manual menjadi eligible setelah field pertama diisi; receipt setelah gambar valid dipilih; voice setelah perekaman dimulai. Cancel, error, dan abandon tetap masuk denominator; double tap/retry dengan `operation_id` sama dihitung satu attempt.
- **Sync within five minutes:** mutation offline yang mencapai status server-confirmed maksimal 5 menit setelah perangkat memiliki koneksi stabil minimal 30 detik dibagi seluruh mutation eligible pada rolling 7 hari. Mutation yang dibatalkan pengguna sebelum koneksi pulih tidak eligible.
- **Crash-free sessions:** sesi tanpa fatal crash dibagi seluruh sesi client pada rolling 7 hari, dipisahkan berdasarkan OS, versi binary, dan OTA.
- **OTA adoption 24h:** instalasi eligible yang menjalankan OTA baru maksimal 24 jam setelah rollout ke channel-nya dibagi instalasi eligible yang membuka app dengan koneksi dalam window tersebut; diukur per release.
- **OTA rollback rate:** instalasi OTA yang harus kembali ke update sebelumnya akibat regression dibagi seluruh instalasi OTA tersebut; diukur per release dan tidak memasukkan rollback drill terencana.

### 14.3 Funnel, engagement, dan delivery

| Metrik | Target awal | Jendela |
|---|---:|---|
| Penyelesaian onboarding sampai akun pertama | ≥ 70% | Beta, rolling 28 hari |
| Activation 24 jam: akun + transaksi pertama + buka ringkasan | ≥ 60% | Cohort user baru mingguan |
| WAU/MAU meaningful users | ≥ 45% | Rolling 7/30 hari setelah minimal 30 hari data |
| D30 retained | ≥ 25% | Cohort activated users, hari 27–33 |
| Median waktu quick-add manual | ≤ 15 detik | Phase 1 |
| Quick-add completion manual | ≥ 97% | Rolling 28 hari |
| Quick-add completion receipt | ≥ 85% | Rolling 28 hari |
| Quick-add completion voice | ≥ 88% | Rolling 28 hari |
| Pengguna aktif yang melakukan review mingguan | ≥ 40% | 90 hari setelah GA |
| Pengguna aktif yang membuat minimal satu anggaran | ≥ 30% | 90 hari setelah GA |
| Transaksi dengan kategori terkonfirmasi | ≥ 85% | Bulanan |
| Mutation tersinkron ≤ 5 menit setelah koneksi pulih | ≥ 99,5% | Rolling 7 hari |
| Crash-free sessions beta | ≥ 99,7% | Rolling 7 hari |
| Crash-free sessions GA | ≥ 99,9% | Rolling 7 hari |
| OTA adoption dalam 24 jam | ≥ 80% | Per OTA release/channel |
| OTA rollback rate | < 0,5% | Per OTA release |

### 14.4 Kualitas otomatisasi dan kepercayaan

| Metrik | Target awal | Catatan |
|---|---:|---|
| Akurasi exact-match OCR untuk total pada dataset struk Indonesia yang disetujui | ≥ 95% | Sebelum Gate Phase 2 ditutup |
| Akurasi OCR merchant dan tanggal | ≥ 90% masing-masing | Sebelum Gate Phase 2 ditutup |
| Voice intent + nominal benar pada utterance Bahasa Indonesia yang didukung | ≥ 92% | Kondisi benchmark terdokumentasi |
| Draft OCR/voice disimpan setelah ≤ 1 koreksi field penting | ≥ 75% | Beta; indikator value, bukan alasan menyembunyikan error |
| Duplikasi akibat retry sync | 0 pada test suite; < 0,01% teramati | Release gate |
| Transaksi terkonfirmasi hilang | 0 | Zero tolerance |
| Insiden akses data lintas pengguna/household | 0 | Zero tolerance |
| Insight AI mendapat rating membantu | ≥ 70% | Phase 5 controlled beta, minimum 200 ratings |

### 14.5 Guardrail

- Crash-free sessions dan sync success mengikuti NFR.
- Tingkat opt-out analytics/AI dipantau sebagai sinyal kepercayaan, bukan dipaksa turun.
- Jumlah koreksi OCR/voice tidak disembunyikan dari laporan kualitas.
- Tidak ada pertumbuhan yang dibayar dengan dark pattern, penjualan data, permission berlebihan, atau notifikasi agresif.

## 15. Hipotesis monetisasi

Bagian ini adalah **asumsi untuk diuji, bukan keputusan harga final**.

- Model awal: freemium tanpa iklan dan tanpa penjualan data.
- Free menjaga hak dasar: akun terbatas namun cukup untuk penggunaan personal, transaksi manual tanpa batas wajar, dashboard, anggaran dasar, recurring dasar, offline sync, export, dan delete account.
- Premium kandidat: akun/anggaran tanpa batas, quota OCR dan voice lebih tinggi, laporan/forecast lanjutan, multi-currency, household, dan AI insights.
- Hipotesis harga Indonesia: Rp39.000/bulan atau Rp349.000/tahun, dengan uji willingness-to-pay sebelum paywall produksi.
- Trial premium kandidat: 14 hari tanpa meminta kartu di awal.
- Prinsip paywall: data yang sudah dibuat tetap dapat dilihat dan diekspor setelah downgrade; fitur keamanan, privasi, dan penghapusan tidak pernah dipaywall.
- Gate keputusan: minimal 100 wawancara/survei tersegmentasi, 2 eksperimen harga yang etis, biaya OCR/voice/AI terukur per active user, serta proyeksi gross margin yang disetujui.

## 16. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Scope “sangat lengkap” memperlambat manfaat inti | Tinggi | Delivery Phase 0–5 tegas; ship ledger lalu capture dan daily value sebelum fitur lanjutan; perubahan scope memakai feature ID dan gate. |
| OCR buruk pada struk kusut/format lokal | Tinggi | Quality check, crop/retake, confidence per field, benchmark struk Indonesia, editor cepat, fallback manual, tidak auto-post. |
| Voice ambigu, bising, atau variasi bahasa | Tinggi | Push-to-talk, transcript terlihat, parser deterministik untuk field inti, clarification UI, benchmark aksen/noise, fallback manual. |
| Kebocoran data keuangan | Sangat tinggi | RLS deny-by-default, private bucket, secure storage, encrypted local DB, redacted telemetry, pen-test, incident runbook. |
| Konflik offline atau duplikasi | Sangat tinggi | Operation ID idempoten, versioning, tombstone, deterministic merge, visible queue, chaos/network tests. |
| Pengguna mengira OTA mengganti semua bagian app | Sedang | Jelaskan empat jenis update; runtime compatibility; store update untuk native; minimum version flow yang jujur. |
| AI hallucination dianggap nasihat | Tinggi | Insight read-only, sumber/periode, rule-based facts, uncertainty language, refusal boundary, user feedback, safety eval. |
| Household membuka data personal | Sangat tinggi | Scope personal/shared eksplisit, RBAC, preview invite, access review, revoke segera, RLS adversarial test. |
| Biaya OCR/voice/AI tidak terkendali | Sedang | Quota transparan, compression, caching aman, rate limit, cost dashboard, premium hypothesis, circuit breaker. |
| App Store/Play policy atau OAuth rejection | Tinggi | Apple login setara di iOS, privacy manifest/labels akurat, permission just-in-time, reviewer account, pre-submission checklist. |
| Kurs membuat laporan menyesatkan | Sedang | Simpan original + rate metadata, manual override, timestamp/sumber, disclaimer, jangan rewrite histori. |
| Ketergantungan vendor | Sedang | Adapter boundary di Edge Functions, format ekspor portable, job state vendor-neutral, exit plan dan DPA review. |
| Bahasa visual terlalu pucat menurunkan aksesibilitas | Sedang | Token kontras terukur, semantic color tambahan, QA screen reader/color blindness, grafik berlabel teks. |

## 17. Dependensi dan prasyarat

- Akun organisasi Expo/EAS, Apple Developer, Google Play Console, dan kredensial signing yang dikelola organisasi.
- Project Supabase terpisah untuk development, staging, dan production; migration pipeline; backup/PITR sesuai tier; region dan data-processing review.
- Konfigurasi Google OAuth dan Apple OAuth untuk setiap environment, termasuk domain, redirect URI, bundle ID, dan account ownership organisasi.
- Evaluasi vendor AI dan exchange-rate berdasarkan akurasi Bahasa Indonesia, DPA, retensi, lokasi data, SLA, biaya, dan kemampuan penghapusan. Vendor OCR/speech-to-text hanya kandidat Phase 5 setelah opt-in eksplisit per capture dan tidak menjadi fallback tersembunyi Phase 2.
- Privacy policy, terms, consent copy, data-retention policy, Data Processing Agreement, dan review regulasi Indonesia/App Store/Play Store sebelum beta eksternal.
- Design system, content guideline Bahasa Indonesia, localization pipeline, dan matriks aksesibilitas.
- CI/CD untuk lint, typecheck, unit/integration/E2E, migration check, RLS test, secret/dependency scan, preview channel, dan signed release.
- Observability, incident response, support workflow, status communication, serta mekanisme pengguna melaporkan kesalahan data/insight.
- Dataset benchmark berizin untuk struk Indonesia dan utterance suara; tidak menggunakan data pengguna produksi tanpa consent khusus.

## 18. Release gates per delivery phase

Gate bersifat kumulatif: sebuah phase hanya dapat ditutup bila gate phase sebelumnya tetap lulus dan requirement keamanan, privasi, integritas data, aksesibilitas, serta operasional yang relevan dengan fitur baru juga lulus.

### Gate Phase 0 — Foundation siap

- Architecture baseline, skema data/versioning, threat model, data-classification map, design system, dan batas analytics disetujui.
- Spike auth, OCR, voice, encrypted offline database, sync conflict, EAS Update/runtimeVersion, serta private Storage menghasilkan keputusan implementasi yang dapat diuji.
- Environment development/staging/production terisolasi; migration pipeline, CI/CD, secret/dependency scan, redacted observability, dan rollback skeleton berjalan.
- Prototype membuktikan navigasi inti serta state empty/loading/error/offline/permission-denied pada perangkat target Android 10/API 29 dan iOS 16.

### Gate Phase 1 — Core Ledger Private Alpha siap

- F01–F06, F16 dasar, F18 dasar, dan F24 dasar bekerja end-to-end untuk tester undangan tanpa ketergantungan OCR, voice, dashboard lengkap, atau fitur planning.
- Test uang, saldo, transfer, split, refund, adjustment, soft delete, rekonsiliasi dasar, timezone, dan idempotensi lulus 100% pada suite kritis.
- Retry, airplane mode, app kill, clock drift, serta konflik dasar tidak menghilangkan atau menggandakan transaksi terkonfirmasi.
- RLS allow/deny matrix, private Storage, token storage, deep link, session revoke, grace-period account deletion, dan encrypted local database lulus; tidak ada temuan Critical/High terbuka.
- Alur alpha lolos Bahasa Indonesia, screen reader, dynamic type, contrast, reduced motion, dan matriks OS minimum.

### Gate Phase 2 — Capture & Daily Value Beta siap

- F07–F09, F11 dasar, F13 inti, dan notifikasi F19 bekerja end-to-end di atas ledger Phase 1.
- OCR dan voice memenuhi benchmark; seluruh hasil menjadi draft, field ambigu terlihat, dan tidak ada transaksi final sebelum konfirmasi pengguna.
- Dashboard, anggaran dasar, recurring, serta notifikasi selalu dapat ditelusuri ke transaksi sumber dan memiliki state offline/failure yang aman.
- Dashboard crash/sync/auth/OCR/voice/cost aktif dengan redaksi tervalidasi; support dan vendor-outage fallback siap untuk beta.
- Crash-free beta ≥ 99,7% selama minimal 14 hari, sync memenuhi target, serta staged OTA dan rollback drill pada beta channel berhasil.

### Gate Phase 3 — Planning & Understanding siap

- F10–F15 dan F16 lengkap bekerja end-to-end; F11 dan F13 yang diperluas tetap backward-compatible dengan data Phase 2.
- Formula laporan, net worth, anggaran, sinking fund, utang/piutang, recurrence, kalender, dan forecast memiliki golden test; fakta, jadwal, asumsi, serta proyeksi dapat dibedakan.
- Setiap agregat dan forecast memiliki drill-down/metodologi; perubahan transaksi memperbarui seluruh turunan tanpa inkonsistensi.
- Search, review, deduplikasi, dan rekonsiliasi lengkap lulus usability test; tidak ada klaim forecast yang dipresentasikan sebagai kepastian atau nasihat.
- Minimal empat minggu telemetry beta menunjukkan zero confirmed data-loss incident dan tidak ada regresi terhadap target crash/sync Phase 2.

### Gate Phase 4 — Collaboration & Global siap

- F17, F20, F23, hardening F18/F24, serta widget/shortcut F19 bekerja end-to-end; Bahasa Inggris lengkap dan locale/currency/timezone matrix lulus.
- Household isolation dan role Owner/Admin/Member/Viewer lulus adversarial RLS test, invite/revoke test, serta cache purge test tanpa kebocoran ruang personal.
- Impor/ekspor, backup restore drill, conflict resolution lanjutan, device/session management, dan alur account deletion lulus recovery test.
- Production binary ditandatangani; runtimeVersion/channel terisolasi; store listing, privacy labels, reviewer notes/account, support URL, minimum-version flow, OTA rollout, dan rollback siap.
- Sebelum GA: minimal 500 beta users dan empat minggu data stabil, zero unresolved Critical/High security issue, zero confirmed data-loss incident, crash-free beta ≥ 99,7%, serta target sync tercapai. Target crash-free GA ≥ 99,9% dipantau sejak hari pertama GA.

### Gate Phase 5 — Optional Intelligence & Connectivity siap

- F21 hanya dirilis setelah opt-in consent, minimisasi data, safety/evaluation set, explainability, feedback, vendor DPA, cost limit, serta refusal boundary lulus.
- F22 hanya dirilis setelah partner resmi, legal/regulatory review, consent granular, revoke, read-only enforcement, refresh transparency, dan reconciliation/deduplication test lulus.
- F21 dan F22 memiliki feature flag, cohort rollout, kill switch, observability tanpa payload finansial, serta incident/rollback plan yang terpisah.
- Kegagalan atau penundaan Phase 5 tidak memblokir GA dan tidak menurunkan fungsi manual, portabilitas, keamanan, atau privasi Phase 0–4.

## 19. Keputusan dan asumsi default

Keputusan berikut memungkinkan eksekusi dimulai tanpa menunggu jawaban tambahan. Product Owner dapat mengubahnya sebelum gate terkait.

1. Nama kerja adalah **FinanceApp**; penamaan merek final dilakukan sebelum store submission.
2. Produk ditujukan untuk usia 17+ dan penggunaan pribadi/rumah tangga, bukan pembukuan bisnis formal.
3. Bahasa Indonesia, IDR, dan `Asia/Jakarta` adalah default; pengguna dapat mengubah locale, currency, dan timezone.
4. Minimum OS adalah iOS 16 dan Android 10/API 29.
5. Google login tersedia di kedua platform; Apple login tersedia setara pada iOS. Tidak ada password lokal pada Phase 1.
6. Bulan anggaran default adalah bulan kalender; rollover nonaktif.
7. OCR dan voice menghasilkan draft; recurring juga draft secara default. Auto-post recurring perlu opt-in per rule.
8. AI insights nonaktif sampai pengguna memberi consent; data dikirim seminimal mungkin melalui Edge Function.
9. Analytics produk bersifat minimal dan terpisah dari data finansial; pengguna dapat opt-out untuk analytics non-esensial.
10. Offline mode mendukung transaksi inti; OCR/voice Phase 2 berjalan di perangkat tanpa server fallback, sementara AI, kurs terbaru, export job, dan opsi cloud capture Phase 5 boleh memerlukan koneksi dengan fallback yang jelas.
11. Household masuk Phase 4; data personal tidak pernah shared otomatis.
12. Bank/e-wallet sync baru Phase 5 dan read-only.
13. Free tier mempertahankan manual tracking dan portabilitas; premium diuji setelah daily value Phase 2 terbukti.
14. Account deletion mencabut seluruh sesi dan menonaktifkan akun segera, memberi grace period pemulihan 7 hari, lalu mem-purge data aktif paling lambat 24 jam setelah grace berakhir. Backup yang masih memuat data tersebut kedaluwarsa maksimal hari ke-30 sejak permintaan awal, kecuali kewajiban hukum yang diinformasikan secara spesifik.

## 20. Pertanyaan validasi untuk Product Owner

Pertanyaan ini tidak memblokir Phase 0 karena default rekomendasi di kolom tengah berlaku sampai diubah.

| Pertanyaan | Default yang direkomendasikan | Dampak bila diubah |
|---|---|---|
| Siapa segmen pertama untuk akuisisi? | Profesional muda Indonesia dengan 2–5 akun/e-wallet | Mengubah onboarding, contoh kategori, channel riset, dan prioritas laporan. |
| Apakah freelancer masuk persona utama Phase 3? | Ya, tetapi tanpa fitur pajak/invoice | Jika tidak, forecast pemasukan tidak tetap dapat diturunkan prioritasnya. |
| Apakah app perlu password/email login? | Tidak pada Phase 1; Google + Apple saja | Menambah recovery, verification, abuse, dan support scope. |
| Apakah transaksi recurring boleh auto-post? | Boleh hanya opt-in per rule; default draft | Jika dilarang, simplifikasi risiko tetapi menambah friksi rutin. |
| Seberapa lama soft-delete transaction? | 30 hari | Mempengaruhi storage, sync tombstone, dan ekspektasi pemulihan. |
| Apakah household wajib sebelum GA? | Ya pada Phase 4, tetapi tidak memblokir beta Phase 2–3 | Jika dikeluarkan dari baseline GA, scope isolation dan collaboration dapat dipisah menjadi post-GA. |
| Apakah AI menjadi selling point awal? | Tidak; Phase 5 setelah data berkualitas dan safety eval | Jika dimajukan, consent/vendor/cost/eval masuk critical path phase sebelumnya. |
| Apakah dark mode wajib saat launch? | Tidak; Phase 4 | Jika dimajukan, design dan QA surface phase sebelumnya bertambah. |
| Apakah pengguna boleh memilih retensi audio untuk peningkatan model? | Default tidak; program opt-in terpisah | Jika ya, perlu consent, DPA, deletion linkage, dan disclosure tambahan. |
| Model harga apa yang pertama diuji? | Rp39.000/bulan dan Rp349.000/tahun, trial 14 hari | Mengubah paywall, entitlement, unit economics, dan eksperimen. |
| Apakah lokasi transaksi disimpan? | Opsional dan nonaktif secara default | Jika aktif default, permission/privacy risk naik dan perlu justifikasi kuat. |
| Kapan bank/e-wallet sync dimulai? | Phase 5 setelah baseline Phase 4 stabil dan partner resmi + legal gate tersedia | Memajukan fitur ini mengubah risiko, biaya, dan timeline secara besar. |
| Apakah Inggris diluncurkan bersamaan dengan Indonesia? | Infrastruktur i18n sejak Phase 0; copy Inggris lengkap pada Phase 4 | Peluncuran bilingual lebih awal menambah content QA tetapi memperluas pasar. |
| Apakah FinanceApp akan bebas iklan selamanya? | Ya; monetisasi subscription, tidak menjual data | Perubahan akan memengaruhi positioning dan trust secara fundamental. |

## 21. Definition of Done tingkat fitur

Sebuah fitur dianggap selesai hanya bila:

- Requirement dan acceptance criteria dokumen fitur terhubung ke ID Fxx serta FR/NFR terkait.
- Happy path, empty/loading/error/offline/permission-denied, retry, dan destructive confirmation ditangani.
- Authorization diperiksa di server, RLS test tersedia, dan telemetry tidak membawa data sensitif.
- Unit/integration/E2E sesuai risiko lulus; perhitungan uang dan sinkronisasi memakai test deterministik.
- Copy Bahasa Indonesia final, aksesibilitas diuji, dan desain memakai token sistem.
- Event pengukuran yang telah disetujui tersedia tanpa over-collection.
- Migration, backward compatibility, remote config, OTA/runtime, dan rollback impact ditentukan.
- Dokumentasi support serta failure/recovery path tersedia.

## 22. Kriteria penerimaan baseline GA setelah Phase 4

Baseline GA dapat dinyatakan berhasil ketika Phase 0–4 beserta gate kumulatifnya lulus: pengguna baru dapat login dan membuat profil keuangan; mencatat pemasukan/pengeluaran/transfer secara manual, melalui struk, atau suara dengan konfirmasi; melihat dashboard, histori, laporan, anggaran, tujuan, recurring, utang/piutang, serta forecast; bekerja offline lalu sinkron tanpa kehilangan atau duplikasi; menggunakan multi-currency dan household sesuai izin; menerima notifikasi serta memakai widget/shortcut yang aman; mengimpor, mengekspor, dan menghapus data; serta seluruh alur memenuhi requirement integritas, keamanan, privasi, aksesibilitas, performa, lokalisasi, distribusi, dan operasional. F21 dan F22 pada Phase 5 bersifat opsional dan bukan syarat GA.
