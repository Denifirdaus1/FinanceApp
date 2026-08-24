# Keputusan Default dan Pertanyaan Validasi

Dokumen ini memisahkan keputusan yang aman untuk langsung dieksekusi dari pertanyaan bisnis yang perlu divalidasi. Tidak ada jawaban yang menghalangi fondasi teknis.

## Keputusan default yang sudah dikunci

| ID | Keputusan | Alasan |
|---|---|---|
| D-001 | Working name tetap `FinanceApp` sampai proses naming terpisah. | Menghindari branding menghambat product discovery. |
| D-002 | Indonesia-first: Bahasa Indonesia, IDR, Asia/Jakarta; English dan mata uang lain lewat arsitektur lokalisasi. | Selaras dengan pengguna awal tanpa menutup ekspansi. |
| D-003 | Produk mencatat dan menganalisis keuangan; tidak menyimpan dana, mengeksekusi pembayaran/trading, atau memberi nasihat investasi personal. | Membatasi risiko regulasi dan ekspektasi. |
| D-004 | Google adalah CTA login utama; Apple menjadi opsi setara pada iOS; sesi memakai PKCE/deep link dan secure storage. | UX sederhana sekaligus siap review App Store. |
| D-005 | Receipt OCR dan speech recognition mengutamakan pemrosesan on-device bila tersedia. | Mengurangi latency, biaya, dan paparan data. |
| D-006 | OCR/voice menghasilkan draft, tidak pernah langsung mem-posting transaksi tanpa konfirmasi pengguna. | Akurasi keuangan lebih penting dari automasi penuh. |
| D-007 | Supabase menjadi backend tunggal v1: Postgres, Auth, private Storage, Realtime, Edge Functions. | Konsistensi operasional dan waktu delivery. |
| D-008 | Data uang disimpan tanpa floating-point; API memakai decimal string/minor-unit contract sesuai exponent mata uang. | Menghindari kesalahan pembulatan. |
| D-009 | Offline memakai encrypted SQLite + outbox + idempotency + version check. | Capture tetap cepat tanpa mengorbankan integritas. |
| D-010 | Bank/e-wallet sync berada setelah core manual capture terbukti. | Integrasi regional, kontrak, biaya, dan reliability terlalu besar untuk MVP. |
| D-011 | AI insights opt-in, explainable, berbasis data teragregasi, dan tidak mengklaim sebagai penasihat keuangan. | Privacy dan safety. |
| D-012 | EAS Update hanya untuk JS/aset yang kompatibel; perubahan native/config memerlukan binary baru. | Menjaga compatibility dan kepatuhan store. |

## Pertanyaan validasi dengan default rekomendasi

| ID | Pertanyaan untuk pemilik produk | Default sekarang | Dampak bila diubah |
|---|---|---|---|
| Q-001 | Siapa segmen pertama: individu, pasangan, atau UMKM? | Individu usia 20–40 yang aktif memakai cash, bank, dan e-wallet; household menyusul. | Mengubah onboarding, permissions, dan messaging. |
| Q-002 | Monetisasi: gratis, subscription, atau freemium? | Freemium: core ledger gratis; advanced AI, household, dan bank sync berbayar setelah validasi. | Memengaruhi entitlement dan paywall, bukan ledger. |
| Q-003 | Apakah pengguna wajib membuat akun sebelum mencoba? | Ya untuk data sync, tetapi onboarding edukasi dapat dilihat sebelum login. | Guest mode menambah merge dan deletion complexity. |
| Q-004 | Apakah foto struk perlu disimpan setelah ekstraksi? | Default simpan terenkripsi/private sampai pengguna menghapus; sediakan mode “hapus foto setelah diproses”. | Memengaruhi storage cost dan auditability. |
| Q-005 | Apakah raw audio voice command disimpan? | Tidak pernah secara default; hanya transcript draft lokal selama flow aktif. | Penyimpanan audio membutuhkan consent/retention baru. |
| Q-006 | Metode budget utama? | Category budgeting dengan optional rollover; flex budget menyusul sebagai mode lain. | Mengubah model rule dan onboarding budget. |
| Q-007 | Apakah household melihat semua rekening? | Permission per account: owner memilih shared/private; agregat hanya menghitung data yang boleh dilihat. | Full visibility lebih sederhana tetapi kurang aman. |
| Q-008 | Apakah bank sync dibutuhkan untuk launch publik? | Tidak; impor CSV menjadi jembatan. | Jika ya, vendor/procurement dan compliance masuk critical path. |
| Q-009 | Apakah web app dibutuhkan? | Tidak untuk v1; landing page dan deletion-request page saja. | Web dashboard menambah surface dan design scope. |
| Q-010 | Apakah kategori merchant memakai AI cloud? | Deterministic rules + local history dulu; cloud AI hanya opt-in untuk kasus ambigu. | Mengubah biaya, consent, dan processor agreement. |
| Q-011 | Berapa lama data akun terhapus dipertahankan? | Soft-delete 7 hari untuk pembatalan, lalu purge terjadwal; backup mengikuti siklus maksimal 30 hari. | Wajib diselaraskan dengan privacy notice dan operasi backup. |
| Q-012 | Negara peluncuran pertama? | Indonesia saja pada public v1, meskipun locale lain siap teknis. | Memengaruhi legal review, currency feed, dan store copy. |

## Cara menutup pertanyaan

Setiap keputusan yang berubah harus mencatat tanggal, pemilik, bukti (riset/pilot), dokumen terdampak, dan migration strategy. Keputusan dianggap efektif setelah PRD, file fitur, serta acceptance test diperbarui dalam perubahan yang sama.

