# FinanceApp — Paket PRD Siap Eksekusi

Repositori ini berisi spesifikasi produk dan implementasi untuk aplikasi pencatatan keuangan pribadi iOS/Android. Target awalnya pengguna Indonesia, dengan Bahasa Indonesia, IDR, dan zona waktu Asia/Jakarta sebagai default; arsitekturnya tetap siap untuk lokalisasi dan multi-mata-uang.

## Mulai dari sini

1. Baca [`prd.md`](./prd.md) untuk konteks produk, pengguna, scope, metrik, dan inventaris fitur.
2. Baca [`docs/00-documentation-map.md`](./docs/00-documentation-map.md) untuk urutan dokumen dan source of truth.
3. Gunakan [`Master Task List`](./docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md) untuk urutan setup → full UI → migration → implementasi → QA.
4. Jalankan fitur satu per satu melalui [`Sequential Execution List`](./docs/superpowers/plans/2026-08-24-financeapp-sequential-execution-list.md) dan cek relasinya pada [`Feature Dependency Map`](./docs/superpowers/plans/2026-08-24-financeapp-feature-dependency-map.md).
5. Saat mengerjakan sebuah fitur, baca file mandirinya di [`docs/features`](./docs/features) beserta arsitektur, model data, dan keamanan.

## Keputusan teknis utama

- Mobile: Expo SDK 56, React Native, TypeScript strict, Expo Router, EAS Build/Submit/Update.
- Backend: Supabase Postgres, Auth, Storage, Realtime, dan Edge Functions.
- Login: Google sebagai opsi utama; Apple disediakan setara pada iOS untuk kepatuhan distribusi App Store.
- Offline: Expo SQLite dengan SQLCipher, mutation outbox, idempotency key, dan resolusi konflik berbasis versi.
- Keamanan: RLS pada setiap tabel privat, bucket struk privat, token di secure storage, minimisasi data, dan verifikasi OWASP MASVS.
- Capture: OCR serta speech-to-text memakai adapter platform/on-device; hasil selalu dikonfirmasi pengguna sebelum menjadi transaksi.
- Update: konten dan feature flag dapat berubah dari server; JavaScript/aset kompatibel dapat dikirim melalui EAS Update; perubahan native tetap memerlukan build dan pembaruan App Store/Play Store.

## Status

Dokumentasi ini adalah baseline produk v1.0 untuk discovery tervalidasi dan delivery bertahap. Pertanyaan yang dapat mengubah model bisnis dicatat bersama default rekomendasinya, sehingga tim dapat mulai membangun tanpa menyisakan placeholder teknis.

## Catatan tooling Vercel

Distribusi mobile utama memakai EAS, jadi Vercel bukan dependency runtime v1. Namun, untuk membuka workflow agentic seperti `vercel env pull`, `vercel deploy`, dan `vercel logs` bila landing page/admin web ditambahkan, sangat disarankan memasang Vercel CLI: `npm i -g vercel`.
