# Strategi Testing dan Quality Gates

## 1. Prinsip

Testing berfokus pada integritas uang, isolasi tenant, durability offline, dan kejujuran automasi. OCR, voice, AI, dan bank sync selalu diuji sebagai pemberi saran yang dapat salah; acceptance akhir tetap pada konfirmasi pengguna atau rule yang eksplisit.

## 2. Toolchain yang direkomendasikan

| Lapisan | Tool |
|---|---|
| Type/static | TypeScript strict, ESLint, Prettier, dependency/license scan |
| Unit/domain | Vitest atau Jest satu standar workspace, fast-check untuk property tests |
| React Native | Jest + React Native Testing Library |
| Database | Supabase CLI local, SQL migrations, pgTAP untuk constraint/RLS/RPC |
| Edge Functions | Deno test atau runtime test resmi yang cocok dengan Supabase |
| Contract | Zod fixtures + generated Supabase types + HTTP/RPC contract tests |
| E2E mobile | Maestro pada development/preview builds; critical flows pada real devices |
| Accessibility | React Native accessibility assertions + VoiceOver/TalkBack manual pass |
| Security | Secret scan, dependency audit, SAST, RLS adversarial suite, MASVS checklist |
| Performance | React Native profiling, startup tracing, query `EXPLAIN ANALYZE`, synthetic sync load |

Satu test runner unit dipilih saat scaffolding berdasarkan kompatibilitas Expo SDK 56; jangan memelihara dua runner untuk domain yang sama.

## 3. Struktur test prospektif

```text
apps/mobile/src/**/*.test.ts(x)          unit dan component
packages/domain/src/**/*.test.ts         money, ledger, budget, recurrence
packages/sync/src/**/*.test.ts           outbox, retry, conflict
supabase/tests/rls/*.sql                  tenant isolation
supabase/tests/rpc/*.sql                  atomic ledger operations
supabase/functions/*/index.test.ts        Edge Function
tests/contracts/*.test.ts                 schema client/server
tests/fixtures/receipts/                  synthetic/redacted corpus
tests/fixtures/voice/                     text utterance corpus, tanpa raw voice pengguna
tests/e2e/*.yaml                          Maestro journeys
docs/quality/manual-release-checklist.md  device, store, accessibility
```

## 4. Test pyramid dan cakupan risiko

- Domain finance, parsing, recurrence, permission, sync, dan RLS memiliki test branch/edge-case, bukan sekadar line coverage.
- Target coverage untuk `packages/domain`, `packages/sync`, dan auth/security policies: ≥90% branch; seluruh workspace: ≥80% line/branch.
- Snapshot test tidak menggantikan assertion perilaku; golden snapshot hanya untuk payload/schema/chart yang stabil.
- Property tests memverifikasi invariants: transfer net-zero, sum splits = transaction total, round-trip currency formatting, idempotent retry, dan recurrence monotonic.

## 5. Matriks pengujian fitur kritis

### Auth dan tenant isolation

- Google success/cancel/denied, Apple success/cancel, expired refresh token, revoked provider, deep-link spoof, app restart, offline login state.
- User A tidak dapat select/insert/update/delete row atau object path User/Household B.
- Member yang dihapus segera kehilangan akses; cached data household dipurge/locked.
- Service-role secret tidak muncul pada JS bundle, source map publik, logs, atau OTA manifest.

### Ledger dan perhitungan

- Income, expense, transfer, split, refund, adjustment, debt payment, pending/cleared, timezone boundary, leap day, DST locale non-Indonesia.
- Mata uang exponent 0/2/3, nominal maksimum, negative/zero invalid paths, rounding allocation terakhir, exchange rate precision.
- Concurrent edit dengan `expected_version`; duplicate idempotency key; retry setelah timeout sebelum response diterima.
- Delete/restore mempertahankan audit dan memperbarui agregat tepat satu kali.

### Offline dan sync

- Airplane mode sebelum/during save; force-close setelah local commit; device time salah; token expired; partial batch failure; server 429/5xx; schema version mismatch.
- Outbox urut per aggregate, exponential backoff dengan jitter, dead-letter/review, foreground/background resume.
- Dua device mengubah field sama dan berbeda; membership/revocation terjadi saat offline; logout/account switch menghapus key/cache yang tepat.

### Receipt OCR corpus

- Minimal 300 fixture legal/synthetic/redacted: struk thermal pudar, miring, panjang, glare, multiple totals, tax/service, discount, tip, tanggal ambigu, IDR separator, mixed language.
- Target extraction pada supported corpus: merchant ≥90%, final total ≥95%, date ≥90%; field di bawah confidence threshold wajib ditandai untuk review.
- Uji EXIF rotation, image bomb/dimensi ekstrem, unsupported MIME, corrupted file, duplicate hash, camera denial, low storage/memory.
- Tidak ada fixture berisi PII atau data pembayaran nyata; raw OCR tidak masuk analytics.

### Voice utterance corpus

- Minimal 500 text utterances Bahasa Indonesia dengan variasi informal: “tadi makan 35 ribu pakai GoPay”, pemasukan, transfer, tanggal relatif, koreksi, ambiguity, noise transcript.
- Parser amount/kind/account/date/category F1 target ≥0,92 pada corpus; ambiguous field tidak diisi diam-diam.
- Permission denied, on-device model unavailable, no speech, partial result, interruption, timeout, locale mismatch, cancellation.
- Audio tidak disimpan default; analytics hanya outcome/error code/latency bucket.

### Budget/report/forecast

- Transfer dikecualikan dari income/expense; pending treatment konsisten; rollover, deleted category, backdated transaction, timezone period boundary.
- Report hasilnya sama dengan recompute dari ledger; forecast menandai estimasi dan tidak mengubah ledger.

## 6. E2E journeys minimum

1. Fresh install → Google/Apple sign-in → onboarding → buat account → tambah expense manual → dashboard berubah.
2. Offline → tambah tiga transaksi → force-close → online → sync tanpa duplikasi.
3. Scan struk → koreksi field → split item → simpan → buka private attachment.
4. Voice command → ambiguity prompt → konfirmasi → save.
5. Buat budget dan recurring bill → notification deep link → mark paid.
6. Invite household → accept → akses shared account → cabut akses → denial terverifikasi.
7. Export → delete account → login kembali tidak memulihkan data setelah purge window.
8. Preview OTA → launch health check → promote/rollback; binary runtime incompatible tidak menerima update.

## 7. Device dan OS matrix

- iOS: minimum iOS 16, versi mayor terbaru, satu versi sebelumnya; satu iPhone compact dan satu ukuran besar.
- Android: API 29 minimum, mid-tier API aktif, versi mayor terbaru; vendor stock Android dan minimal satu vendor skin populer.
- Real device wajib untuk camera/OCR, microphone/speech, biometrics, push, deep link, background/resume, low-memory, dan update behavior.
- Simulator/emulator dipakai untuk regresi cepat, bukan satu-satunya bukti native integration.

## 8. CI gates

Setiap pull request menjalankan install lockfile-frozen, format check, lint, typecheck, unit/component, schema/contract, local Supabase migration, pgTAP RLS/RPC, secret/dependency scan, dan build smoke. Main/preview menambah Maestro smoke serta EAS preview build bila native surface berubah.

Perintah target setelah scaffold:

```powershell
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit --coverage
pnpm supabase:test
pnpm test:contract
pnpm test:e2e:smoke
pnpm audit --audit-level high
npx expo-doctor
```

## 9. OTA dan binary release testing

- Channel terpisah: development, preview, production; promotion memakai artifact/update group yang sama, bukan rebuild JS tidak terlacak.
- Runtime version menggunakan fingerprint/explicit policy yang berubah saat native dependency/config berubah.
- Preview cohort memverifikasi startup, auth, migration, cache compatibility, crash-free, dan core journey sebelum production.
- Launch error recovery dan rollback-to-embedded diuji; kill switch server tetap tersedia.
- Perubahan camera/microphone permission strings, native library, SQLCipher config, entitlements, app scheme, atau Expo SDK selalu binary release.

## 10. Definition of Done

Sebuah fitur selesai bila requirement dan acceptance criteria tertaut ke test, telemetry privacy-safe tersedia, error/offline/accessibility state selesai, RLS dan migration lolos, rollback/kill-switch jelas, docs diperbarui, serta tidak ada high/critical finding. Demo bahagia tanpa bukti edge-case bukan Definition of Done.
