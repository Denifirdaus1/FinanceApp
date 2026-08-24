# FinanceApp Master Task List

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah seluruh PRD FinanceApp menjadi satu urutan delivery yang dimulai dari setup, dilanjutkan full UI wireframe, seluruh migration database, implementasi vertikal satu fitur pada satu waktu, lalu QA dan release.

**Architecture:** Monorepo TypeScript memisahkan Expo mobile shell, domain finance, UI system, local encrypted repository/sync engine, dan Supabase infrastructure. Semua screen dibuat sebagai typed interactive wireframe lebih dahulu; seluruh schema/RLS/RPC contract kemudian dimigrasikan dan diuji; setelah itu satu feature slice diaktifkan penuh dari UI ke local repository, Supabase, observability, dan E2E sebelum fitur berikutnya dimulai.

**Tech Stack:** pnpm workspace, Expo SDK 56, React Native, Expo Router, TypeScript strict, TanStack Query v5, Zustand, Zod, React Hook Form, Expo SQLite + SQLCipher, Supabase, Jest, React Native Testing Library, pgTAP, Maestro, EAS Build/Submit/Update.

**Spec:** [`../../../prd.md`](../../../prd.md), [`../../03-technical-architecture.md`](../../03-technical-architecture.md), [`../../04-data-model.md`](../../04-data-model.md), [`../../07-testing-quality.md`](../../07-testing-quality.md), dan [`../../features`](../../features).

## Global Constraints

- Target minimum: Android 10/API 29+ dan iOS 16+.
- TypeScript wajib `strict`; nilai uang persisten memakai integer minor unit, bukan floating point.
- Ledger tunggal adalah `financial_entries` + `entry_splits`; fitur lain tidak boleh membuat sumber saldo paralel.
- Semua data finansial menggunakan `household_id`, RLS, dan account permission sejak migration pertama, walaupun F23 UI sharing dikerjakan kemudian.
- Receipt OCR dan voice recognition Phase 2 berjalan on-device; tidak ada raw OCR/audio/transcript di Supabase.
- Storage receipt private; akses selalu signed URL singkat setelah authorization.
- Data lokal finansial memakai SQLCipher; token dan key memakai SecureStore/Keychain/Keystore.
- EAS Update hanya untuk JavaScript, style, dan asset yang kompatibel dengan `runtimeVersion`; perubahan native wajib binary store release.
- Satu waktu hanya boleh ada satu feature ID berstatus `IN PROGRESS`.
- Fitur berikutnya tidak boleh dimulai sebelum Definition of Done fitur aktif lulus.

---

## 1. Urutan Besar yang Tidak Boleh Ditukar

- [ ] **Stage 0 — Project setup:** monorepo, Expo app, environment, CI, Supabase local, EAS, test harness, dan secure architecture baseline.
- [ ] **Stage 1 — Full UI wireframe:** seluruh F01–F24 mempunyai screen, navigation, state, dan prototype flow lengkap dengan data fixture; belum memakai backend produksi.
- [ ] **Stage 2 — Full database foundation:** seluruh migration F01–F24, RLS, RPC contract, Storage policy, seed, generated types, dan pgTAP diterapkan berurutan.
- [ ] **Stage 3 — Sequential vertical implementation:** aktifkan satu fitur dari FE ke local data, Supabase, analytics, security, dan test; tutup fitur sebelum pindah.
- [ ] **Stage 4 — Cross-feature QA:** regression penuh, security/privacy, offline/recovery, performance, accessibility, dan store readiness.
- [ ] **Stage 5 — Release:** internal build, closed beta, staged rollout, monitoring, rollback drill, dan GA gate.

Jika suatu tahap gagal, kembali hanya ke task penyebab. Jangan membuka fitur baru sebagai jalan memutar.

---

## 2. Stage 0 — Project Setup dan Quality Baseline

### Task S00: Kunci struktur repository

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.env.example`
- Create: `apps/mobile/`, `packages/domain/`, `packages/ui/`, `packages/data/`, `packages/sync/`, `packages/config/`, `supabase/`, `tests/e2e/`

- [ ] Buat pnpm workspace dan pin package manager di root `package.json`; sediakan filter scripts `test:feature` dan `test:e2e:feature` untuk satu feature ID.
- [ ] Buat Expo SDK 56 TypeScript app di `apps/mobile` dan aktifkan Expo Router.
- [ ] Buat package boundaries; package domain tidak boleh mengimpor React Native atau Supabase client.
- [ ] Tambahkan root scripts: `format:check`, `lint`, `typecheck`, `test:unit`, `supabase:test`, `test:contract`, `test:e2e:smoke`, dan `quality`.
- [ ] Jalankan `pnpm install --frozen-lockfile`, `pnpm lint`, dan `pnpm typecheck` sampai exit code 0.
- [ ] Commit hanya file setup dengan pesan `chore: scaffold finance app workspace`.

### Task S01: Environment dan secret boundary

**Files:**

- Create: `packages/config/src/env.ts`, `apps/mobile/app.config.ts`, `.env.example`
- Test: `packages/config/src/env.test.ts`

- [ ] Tulis failing tests untuk missing/invalid Supabase URL, anon key, environment name, dan EAS update channel.
- [ ] Implementasikan Zod environment parser; jangan pernah expose service-role key ke mobile bundle.
- [ ] Pisahkan `development`, `preview`, dan `production` Supabase project serta EAS channel.
- [ ] Jalankan `pnpm test:unit -- env` dan verifikasi valid/invalid fixtures.

### Task S02: Navigation, provider, dan error boundary

**Files:**

- Create: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(public)/`, `apps/mobile/app/(app)/`, `apps/mobile/src/app/providers/`, `apps/mobile/src/app/errors/`
- Test: `apps/mobile/src/app/__tests__/bootstrap.test.tsx`

- [ ] Tulis route contract untuk public, authenticated, modal, deep-link, dan unauthorized fallback.
- [ ] Pasang Query Client, theme provider, session façade, global error boundary, safe-area, dan accessibility announcement.
- [ ] Tambahkan deterministic loading/error/offline bootstrap screens.
- [ ] Jalankan component test untuk session absent, loading, authenticated, revoked, dan corrupted local DB.

### Task S03: Testing dan CI

**Files:**

- Create: `jest.config.ts`, `supabase/tests/`, `tests/e2e/smoke.yaml`, `.github/workflows/ci.yml`

- [ ] Pakai satu Jest standard untuk domain dan React Native; tambahkan React Native Testing Library dan fast-check.
- [ ] Siapkan Supabase CLI reset/migration/pgTAP command.
- [ ] Siapkan Maestro development-build smoke untuk launch, public route, dan mocked authenticated shell.
- [ ] CI menjalankan frozen install, format, lint, typecheck, unit/component, Supabase migration + pgTAP, contract test, secret scan, dependency audit, dan smoke build.
- [ ] Buktikan CI gagal saat test fixture sengaja dibuat merah, lalu pulihkan dan buktikan hijau.

### Task S04: Supabase dan EAS baseline

**Files:**

- Create: `supabase/config.toml`, `supabase/seed.sql`, `eas.json`, `apps/mobile/app.config.ts`

- [ ] Inisialisasi Supabase local tanpa mengubah project production.
- [ ] Tentukan migration naming `YYYYMMDDHHMM_<sequence>_<feature>_<purpose>.sql`.
- [ ] Konfigurasi Google OAuth, Apple Sign-In pada iOS, callback/deep-link allowlist, dan placeholder redirect untuk dev/preview/prod.
- [ ] Konfigurasi EAS development/preview/production profile serta `runtimeVersion` policy.
- [ ] Buat development build Android/iOS; Expo Go tidak menjadi acceptance environment.
- [ ] Jalankan cold-start/deep-link smoke pada minimal satu Android dan satu iOS device/simulator.

### Task S05: Security, local database, dan observability skeleton

**Files:**

- Create: `packages/sync/src/db/`, `packages/sync/src/outbox/`, `apps/mobile/src/security/`, `apps/mobile/src/analytics/`

- [ ] Buat per-install SQLCipher key lifecycle di SecureStore dan test logout/delete purge.
- [ ] Definisikan repository interface, local transaction boundary, outbox envelope, idempotency key, version, tombstone, dan purge directive.
- [ ] Buat analytics allowlist/redaction layer; financial payload dan raw capture dilarang.
- [ ] Buat app-lock/privacy-mode façade walaupun F24 UI diselesaikan kemudian.
- [ ] Jalankan key-loss, logout, revoked-session, corrupted DB, redaction, dan offline boot tests.

**Stage 0 gate:** `pnpm quality`, `pnpm supabase:test`, dan `pnpm test:e2e:smoke` lulus; dev build berjalan; tidak ada secret atau service-role key di bundle.

---

## 3. Stage 1 — Full UI Wireframe F01–F24

Wireframe di tahap ini harus interactive dan memakai typed fixture repository. Tombol yang belum terhubung backend mengembalikan deterministic mock result; tidak boleh berisi dead button.

### Task U00: Design system warm pastel minimal

**Files:**

- Create: `packages/ui/src/tokens/`, `packages/ui/src/components/`, `packages/ui/src/patterns/`, `apps/mobile/src/storybook/`

- [ ] Implementasikan cream/warm-neutral surface, pastel semantic accents, typography, spacing, radius, shadow, icon, motion, dan chart tokens dari `docs/02-ux-ui-design-system.md`.
- [ ] Buat primitives: Button, Input, MoneyInput, Select, Card, ListRow, Sheet, Dialog, Toast, EmptyState, Skeleton, ErrorState, PermissionState, OfflineBanner, SensitiveValue, dan ChartFrame.
- [ ] Verifikasi 320 px width, font scale 200%, screen reader labels, contrast, reduce motion, dan touch target.
- [ ] Freeze token/component API sebelum screen production dibangun.

### Task U01: Navigation dan screen inventory

- [ ] Buat route manifest untuk seluruh screen F01–F24.
- [ ] Buat bottom tabs utama: Home, Transactions, Planning, Reports, Profile; capture menjadi global action.
- [ ] Buat deep-link map untuk transaction, receipt, recurring item, notification, connection, dan household invite.
- [ ] Buat screen catalog dan tandai setiap route `WIREFRAME READY`, `BACKEND READY`, atau `INTEGRATED`.

### Task U02–U25: Wireframe per fitur

Selesaikan seluruh baris berikut sebelum Stage 2:

| Task | Feature | Screen/flow minimum yang wajib selesai |
|---|---|---|
| U02 | F01 | Welcome, Google/Apple sign-in, OAuth callback, session bootstrap, auth error, account bootstrap |
| U03 | F02 | Financial setup, currency/locale/timezone, privacy/analytics preference, edit profile |
| U04 | F03 | Accounts list/detail/create/edit/archive, asset valuation, liability/debt shell |
| U05 | F04 | Category/tag list, create/edit, hierarchy, rule list/editor/test result |
| U06 | F05 | Transaction composer, review, detail, edit, duplicate warning, void/restore |
| U07 | F06 | Transfer composer, split editor, adjustment, reversal, locked-period error |
| U08 | F17 | Currency settings, FX rate source, missing-rate state, cross-currency transfer review |
| U09 | F18 | Sync status, retry, pending mutation list, conflict resolution, revoked-access purge notice |
| U10 | F07 | Camera/gallery/PDF entry, crop, OCR progress, correction/review, receipt detail |
| U11 | F08 | Permission, listening, transcript/intent review, ambiguous entity resolution, manual fallback |
| U12 | F09 | Dashboard, period switcher, daily summary, balance cards, empty/partial-FX/offline states |
| U13 | F10 | Reports hub, cash-flow, category trend, net worth, drill-down, export entry |
| U14 | F11 | Budget list/detail, create/edit lines, allocation, transfer adjustment, threshold state |
| U15 | F12 | Goal list/detail, create/edit, linked accounts, contribution/withdrawal, missing-rate state |
| U16 | F13 | Recurring list/detail/editor, generated occurrence, match/review, skip/snooze |
| U17 | F14 | Debt list/detail, terms, payment breakdown, statement, payoff projection disclaimer |
| U18 | F15 | Calendar month/day, forecast timeline, scenario editor, low-balance explanation |
| U19 | F16 | Search/filter, saved search, review inbox, duplicate comparison, reconciliation session |
| U20 | F20 | Import wizard, mapping, preview, row errors, commit result, export/privacy-export status |
| U21 | F23 | Household settings, invite/join, member roles, per-account permission, revoke audit |
| U22 | F24 | Security hub, app lock, privacy mode, sessions, consents, export, delete-account flow |
| U23 | F19 | Notification preferences, snooze, widget privacy, shortcut setup, deep-link failure |
| U24 | F21 | AI consent, insight feed, assistant, source explanation, feedback, unavailable state |
| U25 | F22 | Connections, provider consent, account mapping, staging/reconciliation, sync/error/revoke |

Untuk setiap U02–U25:

- [ ] Implementasikan happy path dan loading, empty, offline, permission denied, forbidden, validation, server error, retry, dan destructive confirmation states.
- [ ] Tambahkan fixture factory dengan data Indonesia (`id-ID`, IDR, Asia/Jakarta) dan multi-currency edge case.
- [ ] Tambahkan component/navigation test untuk primary flow dan back/deep-link behavior.
- [ ] Jalankan manual accessibility pass dan screenshot matrix Android/iOS.
- [ ] Review UX terhadap feature spec, lalu tandai `WIREFRAME READY`.

**Stage 1 gate:** seluruh 24 fitur berstatus `WIREFRAME READY`; tidak ada route kosong/dead button; navigation, responsive, accessibility, dan destructive-flow review lulus.

---

## 4. Stage 2 — Migration Database untuk Semua Fitur

Migration dibuat dan diterapkan sesuai urutan berikut. Nomor migration adalah urutan dependency, bukan urutan nomor feature.

| Seq | Owner | Isi migration utama |
|---:|---|---|
| 000 | Foundation | Extensions, currencies, common sync/audit columns, helper schema, grants, timestamp/version helpers |
| 001 | F01 | Profiles, user consents, device installations, households, members, invitations, auth triggers |
| 002 | F02 | User preferences dan user-scope sync |
| 003 | F03 | Accounts, account permissions, asset valuations, debt shell, account balance RPC |
| 004 | F04 | Categories, tags, entry tags, classification rules/conditions |
| 005 | F05 | Merchants, financial entries, entry splits, mutation deduplication, audit events, ledger RPCs |
| 006 | F06 | Transfers, balance adjustment details, period locks, transfer/reversal RPCs |
| 007 | F17 | Exchange rates, reporting amount/rate constraints, FX lookup contracts |
| 008 | F18 | Sync changes, pull/push RPCs, user/household cursors, purge directives; local SQLCipher schema version |
| 009 | F07 | Attachments, receipt extractions/items, private receipt bucket policies, confirm-capture RPC |
| 010 | F08 | Entity aliases dan allowed voice provenance only; tidak membuat server audio/transcript/session table |
| 011 | F09 | Dashboard preferences dan permission-scoped derived snapshots |
| 012 | F10 | Report presets dan rebuildable balance snapshots |
| 013 | F11 | Budgets, lines, category joins, periods, adjustments, derived summaries |
| 014 | F12 | Goals, account links, contributions, target history, milestone events |
| 015 | F13 | Recurring rules, versions, occurrences, reminders, generation/match RPCs |
| 016 | F14 | Debts, loan terms, ledger links, payment groups, statements/schedules |
| 017 | F15 | Calendar preferences, scenarios, overrides, permission-scoped forecast cache |
| 018 | F16 | Saved searches, review items, duplicate links, reconciliation sessions/items |
| 019 | F20 | Import jobs/rows, export jobs, private temporary import/export bucket policies |
| 020 | F23 | Household sharing role/permission hardening, invitation/revoke RPCs, visibility-scoped audit |
| 021 | F24 | Security preferences, consent/account deletion lifecycle, session/device projections |
| 022 | F19 | Notification preferences/jobs/deliveries/snoozes and scheduler dedupe |
| 023 | F21 | AI sessions/messages/runs/feedback/insight snapshots with explicit consent and retention |
| 024 | F22 | Connections, external accounts, cursors/events, staging transactions, reconciliation links/consents |

Untuk setiap migration 000–024:

- [ ] Tulis migration SQL dan rollback/recovery note sebelum menjalankannya.
- [ ] Tulis pgTAP failing tests untuk table constraints, cross-household denial, role/action matrix, direct-write denial, RPC success, idempotency, and generic forbidden response.
- [ ] Jalankan `supabase db reset`; pastikan migration dapat dibuat dari database kosong.
- [ ] Jalankan `pnpm supabase:test`; perbaiki sampai semua pgTAP lulus.
- [ ] Regenerasi Supabase TypeScript types dan jalankan `pnpm typecheck`.
- [ ] Verifikasi migration tidak membuat ledger, balance cache, atau ownership path paralel.
- [ ] Commit satu migration owner beserta test-nya sebelum mengerjakan migration berikutnya.

**Stage 2 gate:** clean reset menerapkan 000–024 tanpa manual patch; semua RLS/RPC/Storage pgTAP lulus; generated types bersih; schema diff terhadap migration history kosong.

---

## 5. Stage 3 — Sequential Feature Activation

Gunakan urutan dependency berikut dan detail pada [`2026-08-24-financeapp-sequential-execution-list.md`](./2026-08-24-financeapp-sequential-execution-list.md):

1. F01 → 2. F02 → 3. F03 → 4. F04 → 5. F05 → 6. F06 → 7. F17 → 8. F18 → 9. F07 → 10. F08 → 11. F09 → 12. F10 → 13. F11 → 14. F12 → 15. F13 → 16. F14 → 17. F15 → 18. F16 → 19. F20 → 20. F23 → 21. F24 → 22. F19 → 23. F21 → 24. F22.

### Feature Focus Gate

Untuk setiap fitur aktif:

- [ ] Ubah hanya satu feature status menjadi `IN PROGRESS`.
- [ ] Baca spec feature, dependency map, migration, RLS, analytics, dan acceptance criteria.
- [ ] Tulis failing domain/component/contract/E2E tests untuk acceptance criteria fitur tersebut.
- [ ] Implementasikan domain/use case dan local repository terlebih dahulu.
- [ ] Hubungkan wireframe screen ke repository/use case; hapus fixture hanya pada route fitur aktif.
- [ ] Hubungkan mutation/query ke Supabase RPC/authorized projection dan sync/outbox.
- [ ] Implementasikan offline, retry, idempotency, conflict, permission revoke, analytics redaction, dan accessibility states.
- [ ] Jalankan feature test bundle, dependency regression, cross-feature integration edges, dan device smoke.
- [ ] Review security, schema, telemetry, accessibility, performance, dan OTA/native impact.
- [ ] Commit exact-path feature slice; ubah status menjadi `DONE` hanya bila Definition of Done lulus.
- [ ] Baru setelah itu aktifkan fitur berikutnya.

---

## 6. Stage 4 — QA dan Release Hardening

### Task Q01: Full regression

- [ ] Jalankan `pnpm quality`, `pnpm supabase:test`, `pnpm test:contract`, dan seluruh Maestro suite.
- [ ] Jalankan fresh-install, upgrade, logout/login, account switch, permission revoke, offline-first, conflict, process kill, background/resume, timezone, dan multi-currency matrix.
- [ ] Verifikasi tidak ada duplicate ledger, partial transfer, stale permission cache, atau lost mutation.

### Task Q02: Security dan privacy

- [ ] Audit RLS allow/deny matrix seluruh tabel dan Storage.
- [ ] Jalankan secret/dependency/license scan dan mobile static/dynamic checks sesuai MASVS.
- [ ] Capture traffic receipt/voice untuk membuktikan raw image/OCR/audio/transcript tidak keluar pada Phase 2.
- [ ] Jalankan account deletion drill: grace 7 hari, active purge, provider revoke, backup expiry Day 30.
- [ ] Jalankan analytics/log/crash redaction audit dengan hostile financial fixtures.

### Task Q03: Accessibility, performance, dan resilience

- [ ] VoiceOver/TalkBack untuk seluruh critical journey dan screen reader privacy labels.
- [ ] Font scale 200%, 320 px width, contrast, reduce motion, touch target, keyboard/form behavior.
- [ ] Startup, list, dashboard/report, local query, sync batch, image handling, dan memory profiling terhadap NFR.
- [ ] Uji server timeout, 429, provider outage, expired auth, corrupted cache, disk full, clock drift, dan killed background task.

### Task Q04: Store dan rollout

- [ ] Build signed internal Android/iOS binary dan jalankan smoke pada real devices.
- [ ] Lengkapi privacy disclosure, account deletion web resource, permissions copy, Google/Apple auth, dan store metadata.
- [ ] Jalankan EAS Update compatibility/rollback drill pada runtime yang sama.
- [ ] Closed beta → staged production rollout → GA hanya bila release gates pada roadmap lulus.

---

## 7. Definition of Done per Fitur

Sebuah fitur hanya boleh berstatus `DONE` jika seluruh poin ini benar:

- [ ] Seluruh functional requirement dan acceptance criteria feature spec memiliki test evidence.
- [ ] UI tidak lagi memakai fixture untuk flow fitur aktif.
- [ ] Local-first create/read/update/delete, offline queue, retry, dan conflict behavior bekerja.
- [ ] Supabase migration, RLS, RPC, Storage, dan generated types sesuai kontrak.
- [ ] Unauthorized/cross-household/revoked-account cases ditolak tanpa metadata leak.
- [ ] Unit, component, pgTAP, contract, integration, dan critical Maestro tests lulus.
- [ ] Dependency regression dan consumer integration edge lulus.
- [ ] Loading, empty, offline, denied, error, retry, destructive, dan accessibility states lulus.
- [ ] Analytics memakai allowlist dan tidak mengirim nominal, merchant/note, receipt/audio, atau object identifier sensitif.
- [ ] Tidak ada Critical/High security issue, broken migration, type error, atau flaky critical test.
- [ ] Dokumentasi status, decision, test evidence, dan migration reference diperbarui.

## 8. Stop Rules

- Jangan memulai dua fitur paralel yang menyentuh ledger/RLS yang sama.
- Jangan menunda test sampai akhir; test fitur berjalan pada task yang sama dengan implementasinya.
- Jangan menandai screen sebagai selesai bila masih fixture-backed tetapi statusnya sudah `INTEGRATED`.
- Jangan mengubah migration yang sudah diterapkan ke shared environment; buat migration koreksi baru.
- Jangan mengirim native-module/config change melalui OTA.
- Jangan melanjutkan ke fitur consumer bila prerequisite masih memiliki failed acceptance criterion.
