# FinanceApp Master Implementation Plan

> **Untuk pekerja agentic:** gunakan `superpowers:subagent-driven-development` (direkomendasikan) atau `superpowers:executing-plans`, kerjakan task satu per satu, dan gunakan checkbox sebagai status. Baca `../prd.md`, arsitektur, model data, security, serta file fitur terkait sebelum task.

**Goal:** Menghasilkan aplikasi personal-finance iOS/Android yang aman, offline-capable, dan dapat menangkap transaksi manual, dari struk, atau dari suara.

**Architecture:** Monorepo TypeScript memisahkan mobile shell, domain finance murni, sync engine, UI system, dan Supabase infrastructure. Client melakukan local-first commit ke SQLCipher/outbox; Supabase RPC melakukan mutasi atomik serta RLS mengisolasi household.

**Tech stack:** pnpm workspace, Expo SDK 56, React Native, Expo Router, TypeScript strict, TanStack Query v5, Zustand, Zod, React Hook Form, Expo SQLite+SQLCipher, Supabase, EAS.

**Spec:** `prd.md` dan `docs/00-documentation-map.md`. Untuk eksekusi operasional terbaru gunakan `docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md`, lalu `2026-08-24-financeapp-sequential-execution-list.md` dan `2026-08-24-financeapp-feature-dependency-map.md`.

## Global constraints

- Minimum iOS 16 dan Android API 29; Bahasa Indonesia/IDR/Asia-Jakarta default.
- Tidak ada floating-point untuk domain uang; transfer internal net-zero.
- Semua data privat dan receipt objects dilindungi RLS; service role server-only.
- OCR/voice/AI menghasilkan draft dan memerlukan konfirmasi sesuai feature spec.
- TypeScript strict, coverage domain/sync/security ≥90% branch, workspace ≥80%.
- Native/config changes menggunakan binary release; OTA hanya runtime-compatible JS/assets.

## Struktur file target

```text
apps/mobile/app/                         Expo Router screens/layouts
apps/mobile/src/features/                vertical feature slices F01-F24
apps/mobile/src/platform/                auth, camera, speech, biometrics, notifications
packages/domain/src/                     money, ledger, budgets, recurrence, forecasts
packages/data/src/                       repositories, Supabase contracts, mapping
packages/sync/src/                       SQLCipher schema, outbox, conflict resolver
packages/ui/src/                         tokens dan accessible components
packages/analytics/src/                  typed privacy-safe events
supabase/migrations/                     schema, indexes, functions, RLS, storage
supabase/functions/                      privileged provider adapters/jobs
supabase/tests/                          pgTAP RLS/RPC/migration tests
tests/contracts/                         Zod/API compatibility
tests/e2e/                               Maestro journeys
```

## Task 1 — Scaffold dan quality baseline

**Files:** root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.env.example`, `.gitignore`; create `apps/mobile`, packages, `.github/workflows/ci.yml`.

**Produces:** workspace scripts `lint`, `typecheck`, `test:unit`, `supabase:test`, `test:contract`, `test:e2e:smoke`, `quality`.

- [ ] Scaffold Expo SDK 56 TypeScript app secara non-interaktif dan pasang Expo Router.
- [ ] Buat workspace packages dengan boundary lint dan TypeScript project references.
- [ ] Tulis failing smoke tests untuk import domain/UI/data tanpa circular dependency.
- [ ] Tambahkan CI frozen-lockfile, lint, typecheck, unit, audit, dan `npx expo-doctor`.
- [ ] Jalankan `pnpm quality`; simpan lockfile; commit `chore: scaffold finance app workspace` dengan exact-path staging.

## Task 2 — Design system dan navigation shell

**Files:** `packages/ui/src/tokens/*`, `packages/ui/src/components/*`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(app)/_layout.tsx`, Storybook/catalog route, tests.

**Produces:** `ThemeProvider`, semantic tokens, `MoneyText`, `Button`, `Field`, `Card`, `BottomSheet`, `SensitiveValue`, screen-state components.

- [ ] Tulis component/a11y tests dari `02-ux-ui-design-system.md`, termasuk font scale 200%, labels, dan reduced motion.
- [ ] Implement warm cream light/dark tokens tanpa hardcoded feature colors.
- [ ] Implement auth/app route groups, tab shell, global add action, loading/offline/error/privacy states.
- [ ] Verifikasi contrast, VoiceOver/TalkBack labels, compact/large viewport.
- [ ] Commit `feat: add accessible mobile design system and shell`.

## Task 3 — Supabase schema, RLS, storage, dan generated contracts

**Files:** `supabase/migrations/0001_extensions.sql` hingga domain migrations; `supabase/tests/rls/*.sql`, `supabase/tests/rpc/*.sql`; `packages/data/src/generated/database.types.ts`.

**Produces:** tenant-safe tables/RPC dari `04-data-model.md`; `create_financial_entry(input, idempotency_key, expected_version)` dan private receipt bucket policies.

- [ ] Tulis pgTAP failing tests untuk constraints money/splits, User A vs B, household permissions, revocation, object path, dan idempotency.
- [ ] Buat tables/indexes/check constraints/triggers dengan migration forward-only.
- [ ] Aktifkan RLS eksplisit untuk setiap table privat; buat membership helper yang `security definer` hanya bila aman dan search path terkunci.
- [ ] Buat atomic RPC dan receipt Storage policies; batasi MIME/size.
- [ ] Generate types, jalankan local reset + pgTAP dua kali, lakukan migration rollback/restore drill.
- [ ] Commit `feat: add tenant-safe finance data model`.

## Task 4 — Authentication dan account lifecycle (F01, F02, F24)

**Files:** `apps/mobile/src/features/auth/*`, `apps/mobile/src/platform/auth/*`, `supabase/functions/delete-account/*`, callback routes, tests.

**Produces:** `AuthGateway.signIn(provider)`, secure session adapter, bootstrap profile/household, logout, export/delete request.

- [ ] Tulis tests success/cancel/error/deep-link spoof/session expiry/account switch.
- [ ] Implement Google OAuth PKCE; implement Apple equivalent pada iOS; strict redirect allowlist.
- [ ] Persist session menggunakan encrypted adapter dengan key material di SecureStore dan AppState refresh lifecycle.
- [ ] Implement idempotent profile bootstrap dan consent ledger.
- [ ] Implement logout cache/key purge serta authenticated delete workflow dengan 7-day grace/purge job.
- [ ] E2E fresh install/auth/logout/delete; commit `feat: add secure authentication and account controls`.

## Task 5 — Encrypted local data dan sync engine (F18)

**Files:** `packages/sync/src/db/*`, `outbox/*`, `conflicts/*`, `apps/mobile/src/platform/network/*`, tests.

**Produces:** `LocalRepository`, `Outbox.enqueue`, `SyncCoordinator.run`, `ConflictResolver`, schema migration/version contract.

- [ ] Tulis fault tests airplane mode, force-close, retry-after-timeout, 429/5xx, duplicate key, concurrent devices, membership revoke.
- [ ] Aktifkan SQLCipher melalui Expo config plugin; buat per-install key di SecureStore dan lifecycle rotation/purge.
- [ ] Commit local entity+outbox secara atomik; kirim ordered batches dengan exponential backoff+jitter.
- [ ] Gunakan idempotency key dan `expected_version`; auto-merge hanya field non-overlap, sisanya review queue.
- [ ] Tambahkan sync health telemetry tanpa payload sensitif dan recovery UI.
- [ ] E2E offline/restart/reconnect; commit `feat: add durable encrypted offline sync`.

## Task 6 — Core ledger vertical slices (F03–F06, F16)

**Files:** `packages/domain/src/money|ledger/*`, `apps/mobile/src/features/accounts|categories|transactions|search/*`, repository adapters, tests.

**Produces:** exact money types, entry/split invariants, account/category management, manual add, transfer, search/review.

- [ ] Property-test currency exponent, parse/format, split totals, transfer net-zero, and idempotent recompute.
- [ ] Implement domain commands/use cases bebas React/Supabase.
- [ ] Implement account/category CRUD dengan archive semantics dan permission checks.
- [ ] Implement quick-add expense/income/transfer/split dengan local-first confirmation and undo.
- [ ] Implement paged FTS/search, filters, reviewed/reconciled states.
- [ ] Jalankan unit/RPC/component/E2E core journey; commit per independently testable feature slice.

## Task 7 — Receipt capture (F07)

**Files:** `apps/mobile/src/features/receipts/*`, `apps/mobile/src/platform/ocr/*`, `supabase/functions/receipt-*` bila dibutuhkan, fixtures/tests.

**Produces:** `OcrProvider.recognize(image): OcrDocument`, deterministic `ReceiptParser`, review editor, private attachment lifecycle.

- [ ] Bangun synthetic/redacted receipt corpus dan failing parser tests sebelum memilih native adapter.
- [ ] Spike dua kandidat OCR pada real iOS/Android; catat license, maintenance, accuracy, memory, dan binary impact; pilih melalui ADR.
- [ ] Implement crop/rotate/compress, on-device OCR, confidence per field, duplicate hash, manual fallback.
- [ ] Implement review/edit/split; transaksi hanya dibuat setelah CTA konfirmasi.
- [ ] Implement authorized private upload/signed read URL, cleanup, quota, kill switch.
- [ ] Capai target corpus dan device matrix; commit `feat: add reviewed receipt capture`.

## Task 8 — Voice capture (F08)

**Files:** `apps/mobile/src/features/voice-entry/*`, `apps/mobile/src/platform/speech/*`, `packages/domain/src/nl-transaction-parser/*`, fixtures/tests.

**Produces:** `SpeechProvider`, Bahasa Indonesia deterministic parser, ambiguity resolver, confirmation sheet.

- [ ] Buat ≥500 synthetic utterance corpus dan failing intent/entity/parser tests.
- [ ] Spike native on-device availability iOS/Android; verify permission/cancel/interruption/no-model paths.
- [ ] Implement transcript session tanpa raw audio persistence default.
- [ ] Parse type/amount/account/category/date/merchant; field ambigu memicu question chips, bukan guess diam-diam.
- [ ] Reuse F05/F06 confirmation dan mutation path; add kill switch/telemetry.
- [ ] Capai F1 target dan E2E real-device; commit `feat: add confirmable voice transaction entry`.

## Task 9 — Daily value, planning, dan reports (F09–F15)

**Files:** domain aggregators + vertical feature slices dashboard/reports/budgets/goals/recurring/debt/forecast, SQL views/RPC, tests.

**Produces:** satu calculation library yang dipakai seluruh read model; scheduled recurrence/notification jobs yang idempotent.

- [ ] Tulis golden ledger fixtures untuk dashboard, cash flow, net worth, budgets, rollover, goals, debts, recurrence, forecast.
- [ ] Implement aggregation queries/materialized cache dengan recompute verification.
- [ ] Implement dashboard widgets dan privacy mode; lalu report accessible chart/table.
- [ ] Implement budget/goals/debt/recurring secara slice-per-slice dengan exact business rules dari feature docs.
- [ ] Implement forecast berlabel estimasi dan calendar timezone-safe.
- [ ] Load/performance test 10k transactions; commit setiap slice setelah acceptance tests lulus.

## Task 10 — Notifications, export, multi-currency, household (F17, F19, F20, F23)

**Files:** respective feature slices, notification provider, export worker, currency services, household policies/RPC, tests.

- [ ] Implement currency metadata/rate provenance dan immutable original amount; test exponent/rounding.
- [ ] Implement local/push notification preferences, deep links, dedupe, quiet hours; widgets tidak menampilkan nominal saat privacy mode.
- [ ] Implement streaming CSV/JSON export, password-protected archive option, import mapping/dry-run/rollback.
- [ ] Implement invite/accept/revoke dan per-account roles; repeat adversarial RLS/offline revocation tests.
- [ ] Run privacy/export/delete and household E2E; commit by feature.

## Task 11 — Optional AI dan connectivity adapters (F21, F22)

**Files:** `packages/data/src/providers/ai|financial-data/*`, Edge Functions, consent/cost controls, evals.

- [ ] Selesaikan vendor, legal, data-processing, cost, threat-model, dan regional coverage review sebelum memasang SDK.
- [ ] Buat provider-neutral interfaces dan recorded/synthetic contract fixtures.
- [ ] Implement AI only on aggregated/minimized inputs with citations to user data, deterministic validation, opt-in, rate limit, kill switch.
- [ ] Implement read-only bank/e-wallet sync dengan consent, cursor/idempotency, reconciliation, disconnect, and provider outage state.
- [ ] Run safety eval, duplicate matching, RLS, provider failure, deletion tests; staged rollout 1%→10%→50%→100% hanya jika guardrails sehat.

## Task 12 — Release hardening dan store delivery

**Files:** EAS config, app config, privacy manifests/forms, store metadata, `docs/quality/manual-release-checklist.md`, runbooks.

- [ ] Finalize icons/splash/permission copy, privacy policy, Data Safety/App Privacy answers, in-app dan web deletion paths.
- [ ] Run full quality suite, real-device matrix, MASVS review, restore drill, dependency/license audit.
- [ ] Create release candidate binary; verify runtimeVersion fingerprint and update channels.
- [ ] Publish preview OTA, perform health/rollback drill, then promote exact update group.
- [ ] Submit via EAS, monitor rollout rings, stop/rollback on automatic no-go threshold.
- [ ] Tag release and commit `chore: prepare production mobile release`.

## Verification command bundle

```powershell
pnpm quality
pnpm supabase:test
pnpm test:contract
pnpm test:e2e:smoke
npx expo-doctor
npx eas-cli@latest build:list --limit 5
npx eas-cli@latest update:list --branch preview --limit 5
```

Tidak ada task berikutnya boleh dimulai bila task sebelumnya meninggalkan schema, interface, atau security contract yang belum teruji. Perubahan besar pada keputusan produk kembali ke PRD dan feature spec sebelum implementasi.
