# Non-Functional Requirements (NFR)

## 1. Ruang lingkup kualitas

NFR berlaku untuk aplikasi iOS/Android, Supabase, proses OCR/voice, sinkronisasi offline, build, dan update. Target diukur pada production-like environment dengan dataset 10.000 transaksi per pengguna dan perangkat kelas menengah yang masih berada dalam support matrix.

## 2. Performa dan responsivitas

| ID | Requirement | Target dan cara ukur |
|---|---|---|
| NFR-PERF-001 | Startup | Cold start ke shell interaktif ≤2,5 detik pada p75; warm start ≤1 detik pada p75. |
| NFR-PERF-002 | Interaksi lokal | Feedback visual untuk tap/input ≤100 ms pada p95; save lokal draft/transaksi ≤300 ms pada p95. |
| NFR-PERF-003 | Daftar transaksi | First 50 rows tampil ≤700 ms dari cache; pagination berikutnya ≤1,5 detik pada p95 koneksi 4G. |
| NFR-PERF-004 | Dashboard | Data cache tampil ≤800 ms; data fresh ≤2,5 detik pada p95. Widget lambat tidak menahan widget lain. |
| NFR-PERF-005 | OCR | Dari foto diterima sampai draft field tampil ≤6 detik p90 di perangkat support; progres tampil setelah 300 ms. |
| NFR-PERF-006 | Voice | Partial transcript pertama ≤1,2 detik p90; draft terstruktur ≤1 detik setelah final transcript. |
| NFR-PERF-007 | Animasi | 55–60 FPS pada interaction utama; reduced-motion dihormati. |
| NFR-PERF-008 | Ukuran update | OTA differential target ≤5 MB p90; update tidak menghalangi startup pertama. |

## 3. Reliability, durability, dan sync

| ID | Requirement | Target |
|---|---|---|
| NFR-REL-001 | Crash-free sessions | ≥99,7% selama beta; ≥99,9% sebelum general availability. |
| NFR-REL-002 | Durability | Setelah UI menyatakan “tersimpan”, transaksi ada di encrypted local store/outbox; force-close tidak boleh menghilangkannya. |
| NFR-REL-003 | Sync | ≥99,5% mutation tersinkron tanpa intervensi dalam 5 menit setelah koneksi pulih. |
| NFR-REL-004 | Idempotency | Retry request yang sama tidak membuat transaksi, attachment, atau reminder ganda. |
| NFR-REL-005 | Conflict | Conflict tidak menimpa data diam-diam; resolusi otomatis hanya untuk field non-overlap, sisanya masuk review queue. |
| NFR-REL-006 | Backend availability | SLO aplikasi untuk operasi online utama ≥99,9% per bulan, tidak termasuk outage store/device/vendor eksternal. |
| NFR-REL-007 | Backup | Postgres point-in-time/backup sesuai plan; drill restore per kuartal; target RPO ≤24 jam dan RTO ≤4 jam untuk v1. |
| NFR-REL-008 | Degradasi | Ledger manual, pencarian cache, dan draft capture tetap berfungsi tanpa OCR model, speech service, analytics, atau notification service. |

## 4. Integritas finansial

- **NFR-FIN-001:** Tidak memakai IEEE floating-point untuk nilai uang yang disimpan atau dihitung; gunakan integer minor units atau decimal arbitrary precision sesuai currency exponent.
- **NFR-FIN-002:** Transfer internal tidak menambah income/expense; jumlah net transfer dalam currency yang sama adalah nol.
- **NFR-FIN-003:** Agregasi menggunakan timezone household dan cutoff period yang eksplisit; perubahan timezone tidak mengubah timestamp historis.
- **NFR-FIN-004:** Mutasi ledger bersifat atomik melalui RPC/database transaction dan memiliki audit metadata.
- **NFR-FIN-005:** Rekalkulasi dashboard/report dari source ledger harus menghasilkan hasil identik; materialized view/cache bukan source of truth.
- **NFR-FIN-006:** Nilai OCR, voice, AI, currency rate, dan bank sync berstatus `suggested` sampai melewati rule konfirmasi masing-masing.

## 5. Security dan privacy

- **NFR-SEC-001:** Seluruh tabel user/household dan `storage.objects` terkait struk memiliki RLS serta automated negative tests lintas tenant.
- **NFR-SEC-002:** Publishable key boleh berada di client; service-role key dan provider secrets hanya di secret store server/CI, tidak di bundle, log, crash report, atau OTA payload.
- **NFR-SEC-003:** TLS wajib; certificate validation default platform tidak boleh dimatikan.
- **NFR-SEC-004:** Session material terenkripsi dengan key di Keychain/Keystore; database offline memakai SQLCipher dengan key yang tidak berada di source/config publik.
- **NFR-SEC-005:** Aplikasi mengikuti OWASP MASVS untuk storage, crypto, auth, network, platform, code, resilience, dan privacy; high/critical finding memblokir release.
- **NFR-SEC-006:** Receipt upload memvalidasi membership, MIME, magic bytes, ukuran, image dimensions, object path, quota, dan rate limit.
- **NFR-SEC-007:** Analytics tidak menyimpan nominal, merchant text, transcript, isi struk, account name, note, token, email, atau stable device fingerprint secara default.
- **NFR-PRIV-001:** Pengguna dapat melihat tujuan pemrosesan, mengatur consent opsional, mengekspor data, menghapus attachment, dan menghapus akun dari aplikasi.
- **NFR-PRIV-002:** Web deletion-request resource disediakan sebelum Play Store launch; permintaan tercatat dan dapat diaudit.
- **NFR-PRIV-003:** Purge data aktif dimulai setelah grace period 7 hari dan selesai maksimal 24 jam kemudian; seluruh backup yang masih memuat akun kedaluwarsa paling lambat Day 30 sejak original deletion request, sebagaimana dijelaskan pada privacy notice.

## 6. Accessibility dan usability

- **NFR-A11Y-001:** Semua kontrol memiliki accessible name, role, state, dan urutan fokus logis.
- **NFR-A11Y-002:** Kontras teks normal minimal 4,5:1, teks besar 3:1, dan komponen interaktif/non-text 3:1; token yang gagal tidak boleh dipakai untuk konten penting.
- **NFR-A11Y-003:** Dynamic type hingga 200% tidak memotong jumlah, CTA, atau error; layar kritis dapat discroll.
- **NFR-A11Y-004:** Target sentuh minimum 44×44 pt iOS / 48×48 dp Android.
- **NFR-A11Y-005:** Informasi tidak hanya disampaikan dengan warna; chart memiliki summary tekstual dan data table sederhana.
- **NFR-A11Y-006:** VoiceOver dan TalkBack flow auth, add transaction, scan receipt, voice confirmation, budget, dan delete account lulus manual test.
- **NFR-USE-001:** Add expense manual dapat selesai ≤15 detik median setelah onboarding; voice/receipt ≤25 detik termasuk konfirmasi.

## 7. Compatibility dan localization

- **NFR-COMP-001:** Minimum iOS 16 dan Android 10/API 29; dua versi mayor OS terbaru menjadi release matrix utama.
- **NFR-COMP-002:** Core ledger tetap bekerja bila device tidak mendukung on-device OCR/speech; UI menawarkan manual fallback.
- **NFR-COMP-003:** Layout mendukung font scale, compact/large phones, notch, keyboard, orientation portrait, dan tablet secara usable; tablet optimization visual dapat menyusul.
- **NFR-I18N-001:** Copy tidak di-hardcode di component; Bahasa Indonesia lengkap, English-ready, plural/date/number via locale APIs.
- **NFR-I18N-002:** IDR default tanpa digit desimal, tetapi currency exponent 0/2/3 didukung; separator tidak diparsing dengan asumsi satu locale.
- **NFR-I18N-003:** Database menyimpan UTC instant plus timezone context untuk aturan berulang dan periodisasi.

## 8. Maintainability, observability, dan delivery

- Domain, UI, infrastructure, dan provider adapters memiliki dependency direction yang diuji linting.
- TypeScript `strict` tanpa unchecked `any` pada domain, finance calculations, auth, atau sync.
- Public contracts memiliki schema Zod dan versioning; database types dihasilkan dari schema pada CI.
- Error memiliki stable code, correlation ID yang tidak sensitif, severity, retryability, dan user-safe message.
- Monitoring memuat crash-free rate, API/RPC error, RLS denial anomaly, outbox age, OCR/voice quality, OTA adoption, dan binary version distribution.
- Feature flag/kill switch tersedia untuk OCR, voice, AI, bank sync, realtime, dan setiap OTA release berisiko.
- Dependency vulnerability scan berjalan di CI; critical/high yang reachable memblokir release atau memiliki risk acceptance bertanggal.
- Dependency update dan Expo SDK upgrade dilakukan terencana, satu runtimeVersion baru, dengan smoke test binary lengkap.

## 9. Cost guardrails

- Storage image menggunakan resize/compression sebelum upload dan lifecycle policy untuk attachment terhapus.
- Query report dibatasi range/pagination dan memiliki index plan; slow query p95 >500 ms ditinjau.
- AI/cloud parsing tidak dipanggil tanpa consent dan confidence gate; setiap invocation memiliki budget, timeout, dan per-user rate limit.
- Budget operasional divalidasi pada 1k, 10k, dan 100k monthly active users sebelum fitur berbiaya masuk rollout berikutnya.

## 10. Release gate NFR

Release candidate gagal bila ada: kehilangan/duplikasi transaksi; cross-tenant access; high/critical security finding; migration tanpa rollback/restore proof; crash-free < target; flow hapus akun tidak lengkap; atau perubahan native dikirim sebagai OTA. Pengecualian memerlukan risk acceptance tertulis dari product dan security owner.
