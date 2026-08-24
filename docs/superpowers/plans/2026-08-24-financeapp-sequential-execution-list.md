# FinanceApp Sequential Feature Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengintegrasikan 24 fitur FinanceApp satu per satu dari wireframe frontend ke local encrypted data dan Supabase backend, dengan test dan integration gate pada setiap fitur sebelum pekerjaan berpindah.

**Architecture:** Stage setup, full UI wireframe, dan seluruh migration harus sudah lulus sebelum dokumen ini dieksekusi. Setiap task mengambil satu screen set yang masih memakai fixture, menulis test lebih dulu, mengaktifkan domain/local/backend contract, mengganti fixture dengan repository nyata, menguji consumer edges, lalu menutup fitur secara permanen sebelum membuka task selanjutnya.

**Tech Stack:** Expo SDK 56, React Native, Expo Router, TypeScript strict, TanStack Query v5, Zustand, React Hook Form, Zod, SQLCipher, Supabase Postgres/Auth/Storage/RPC/RLS, Jest, React Native Testing Library, pgTAP, Maestro, EAS.

**Spec:** [`2026-08-24-financeapp-master-task-list.md`](./2026-08-24-financeapp-master-task-list.md), [`2026-08-24-financeapp-feature-dependency-map.md`](./2026-08-24-financeapp-feature-dependency-map.md), dan [`../../features`](../../features).

## Global Constraints

- Eksekusi hanya dimulai setelah Stage 0–2 pada master task list lulus.
- Hanya satu feature ID boleh `IN PROGRESS`; fitur selanjutnya tetap `BLOCKED BY ORDER`.
- Migration owner fitur sudah tersedia; perubahan schema baru harus berupa additive corrective migration.
- Tulis failing test sebelum domain/backend/UI integration code.
- Financial screen tidak boleh membaca Supabase langsung; semua akses melalui use case dan repository.
- Mutation online maupun offline memakai mutation/idempotency key yang sama.
- Query dan aggregate wajib permission-scoped; cache tidak dapat memberi akses baru.
- Satu feature commit harus dapat direview dan di-revert tanpa menghapus migration fitur lain.

---

## 1. Protocol Wajib untuk Setiap Feature Task

### A. Focus lock

- [ ] Ubah status feature menjadi `IN PROGRESS`; catat start commit dan owner.
- [ ] Baca spec fitur, migration/RLS/RPC, predecessor contract, consumer edges, analytics, dan acceptance criteria.
- [ ] Freeze daftar file yang boleh disentuh; perubahan dependency di luar daftar harus dicatat sebagai corrective dependency task.

### B. Red test

- [ ] Tambahkan failing unit/property tests untuk domain rules dan money/date behavior.
- [ ] Tambahkan failing component tests untuk screen happy/error/offline/denied states.
- [ ] Tambahkan failing pgTAP/contract tests untuk RLS, RPC, idempotency, dan invalid cross-household ID.
- [ ] Tambahkan failing Maestro journey untuk primary user outcome.
- [ ] Jalankan test filter fitur dan simpan bukti bahwa test gagal karena behavior belum aktif, bukan karena test rusak.

### C. Minimal vertical implementation

- [ ] Implementasikan domain types, validation, calculator/policy, dan use case.
- [ ] Implementasikan SQLCipher repository dan outbox behavior.
- [ ] Implementasikan Supabase authorized projection/RPC adapter.
- [ ] Ganti fixture repository pada screen fitur dengan repository nyata.
- [ ] Implementasikan loading, empty, offline, pending sync, conflict, denied, error, retry, destructive, dan accessibility behavior.
- [ ] Tambahkan analytics melalui allowlist/redaction layer.

### D. Green test dan integration gate

- [ ] Jalankan `pnpm test:feature -- Fxx`.
- [ ] Jalankan `pnpm supabase:test` dan `pnpm test:contract -- Fxx`.
- [ ] Jalankan `pnpm test:e2e:feature -- Fxx` pada development/preview build.
- [ ] Jalankan predecessor regression dan consumer-edge test yang disebut pada task.
- [ ] Jalankan `pnpm lint`, `pnpm typecheck`, dan security/log redaction checks.
- [ ] Review diff; commit exact paths dengan `feat(Fxx): <outcome>`.
- [ ] Ubah feature menjadi `DONE` hanya jika seluruh Definition of Done master plan lulus.

---

## 2. Status Board dan Urutan Kunci

| Order | Feature | Status awal | Dibuka setelah |
|---:|---|---|---|
| 01 | F01 Auth & onboarding | READY | Stage 0–2 |
| 02 | F02 Profile & preferences | BLOCKED BY ORDER | F01 DONE |
| 03 | F03 Accounts/assets/liabilities | BLOCKED BY ORDER | F02 DONE |
| 04 | F04 Categories/tags/rules | BLOCKED BY ORDER | F03 DONE |
| 05 | F05 Manual transactions | BLOCKED BY ORDER | F04 DONE |
| 06 | F06 Transfers/splits/adjustments | BLOCKED BY ORDER | F05 DONE |
| 07 | F17 Multi-currency | BLOCKED BY ORDER | F06 DONE |
| 08 | F18 Offline sync | BLOCKED BY ORDER | F17 DONE |
| 09 | F07 Receipt scan | BLOCKED BY ORDER | F18 DONE |
| 10 | F08 Voice entry | BLOCKED BY ORDER | F07 DONE |
| 11 | F09 Dashboard | BLOCKED BY ORDER | F08 DONE |
| 12 | F10 Reports/net worth | BLOCKED BY ORDER | F09 DONE |
| 13 | F11 Budgets | BLOCKED BY ORDER | F10 DONE |
| 14 | F12 Goals | BLOCKED BY ORDER | F11 DONE |
| 15 | F13 Recurring | BLOCKED BY ORDER | F12 DONE |
| 16 | F14 Debts/loans | BLOCKED BY ORDER | F13 DONE |
| 17 | F15 Calendar/forecast | BLOCKED BY ORDER | F14 DONE |
| 18 | F16 Search/reconciliation | BLOCKED BY ORDER | F15 DONE |
| 19 | F20 Import/export | BLOCKED BY ORDER | F16 DONE |
| 20 | F23 Household sharing | BLOCKED BY ORDER | F20 DONE |
| 21 | F24 Security/privacy controls | BLOCKED BY ORDER | F23 DONE |
| 22 | F19 Notifications/widgets | BLOCKED BY ORDER | F24 DONE |
| 23 | F21 AI insights | BLOCKED BY ORDER | F19 DONE |
| 24 | F22 Bank/e-wallet sync | BLOCKED BY ORDER | F21 DONE |

---

## 3. Feature Tasks

### Task F01: Authentication dan Onboarding

**Files:** `apps/mobile/src/features/auth/`, `apps/mobile/app/(public)/`, `packages/domain/src/auth/`, `packages/data/src/auth/`, `supabase/tests/f01_auth_*.sql`, `tests/e2e/f01-auth.yaml`

**Consumes:** app bootstrap, environment validation, Supabase Auth config, SecureStore façade.  
**Produces:** `SessionRepository`, authenticated user ID, profile bootstrap, default household/membership, consent/session state; dipakai semua fitur.

- [ ] Implementasikan Google OAuth, Apple Sign-In parity pada iOS, PKCE/deep-link callback, session refresh, logout, revoke, dan cold-start restore.
- [ ] Bootstrap `profiles`, `user_consents`, default `households`, dan `household_members` secara idempoten.
- [ ] Hubungkan public/auth wireframe ke session repository; hapus auth fixtures.
- [ ] Test callback replay, cancelled provider, expired refresh token, revoked session, duplicate bootstrap, offline cold start, dan cross-user profile denial.
- [ ] Integration gate: F02 dapat membaca authenticated profile; F03 menerima active household tanpa bypass RLS.

### Task F02: Financial Profile dan Preferences

**Files:** `apps/mobile/src/features/preferences/`, `packages/domain/src/preferences/`, `packages/data/src/preferences/`, `supabase/tests/f02_preferences_*.sql`, `tests/e2e/f02-preferences.yaml`

**Consumes:** F01 session/profile.  
**Produces:** base currency, locale, timezone, period definition, privacy/analytics preferences; dipakai F03–F22.

- [ ] Implementasikan setup pertama, edit preference, validation currency/locale/timezone, dan user-scope sync tanpa household requirement.
- [ ] Pastikan perubahan timezone tidak mengubah historical `business_date`; perubahan base currency tidak menulis ulang nominal asli.
- [ ] Test first-run resume, invalid timezone, preference conflict, offline edit/sync, analytics revoke, dan user A/B isolation.
- [ ] Integration gate: F03 account default currency dan F05 date formatting membaca `PreferenceRepository`, bukan hardcode.

### Task F03: Accounts, Wallets, Assets, dan Liabilities

**Files:** `apps/mobile/src/features/accounts/`, `packages/domain/src/accounts/`, `packages/data/src/accounts/`, `supabase/tests/f03_accounts_*.sql`, `tests/e2e/f03-accounts.yaml`

**Consumes:** F01 household/membership, F02 currency/timezone.  
**Produces:** account IDs, account permission contract, balance query, asset valuation, debt shell; dipakai F04–F22.

- [ ] Implementasikan account create/edit/archive, opening balance, balance kind, restricted access, valuation, dan liability shell.
- [ ] Saldo hanya berasal dari signed account lines + opening balance; valuation hanya untuk account non-transaksional.
- [ ] Test bigint boundaries, archive-with-dependencies, restricted account visibility, permission revoke purge, multi-currency subtotal, dan no-double-count net worth.
- [ ] Integration gate: F04 rule account picker hanya melihat authorized active account; F05 composer menerima typed account reference.

### Task F04: Categories, Tags, dan Rules

**Files:** `apps/mobile/src/features/classification/`, `packages/domain/src/classification/`, `packages/data/src/classification/`, `supabase/tests/f04_classification_*.sql`, `tests/e2e/f04-classification.yaml`

**Consumes:** F01–F03.  
**Produces:** category/tag picker dan deterministic `RuleEngine`; dipakai F05, F07, F08, F11, F13, F22.

- [ ] Implementasikan category `kind`, hierarchy depth, tags, rule conditions, priority, preview, dan deterministic tie behavior.
- [ ] Kategori UX “keduanya” membuat dua row income/expense, bukan enum schema baru.
- [ ] Test cycle/depth, duplicate normalized name, rule priority/tie, amount/currency mismatch, restricted account rule, dan tag cross-household denial.
- [ ] Integration gate: F05 category validation dan classification preview memakai service yang sama.

### Task F05: Manual Transaction

**Files:** `apps/mobile/src/features/transactions/`, `packages/domain/src/ledger/`, `packages/data/src/ledger/`, `supabase/tests/f05_ledger_*.sql`, `tests/e2e/f05-manual-transaction.yaml`

**Consumes:** F01–F04.  
**Produces:** canonical entry/split posting, edit/void/restore, duplicate warning, transaction review flow; menjadi pusat F06–F22.

- [ ] Implementasikan composer → review → atomic post melalui local transaction/outbox dan canonical RPC.
- [ ] Terapkan exact ledger invariants: signed account line, positive category lines, lifecycle/clearing separation, immutable business date semantics.
- [ ] Implementasikan edit as revision/audit behavior, void/restore, tags, merchant normalization, dan duplicate warning non-blocking.
- [ ] Test income/expense signs, split equality, duplicate idempotency, mutation replay, invalid category kind, void/restore, offline post, and forbidden account.
- [ ] Integration gate: F06 dapat reuse ledger service; F07/F08 dapat mengirim corrected draft ke confirmation flow tanpa direct post.

### Task F06: Transfers, Splits, Adjustments, dan Reversal

**Files:** `apps/mobile/src/features/transfers/`, `packages/domain/src/transfers/`, `packages/data/src/transfers/`, `supabase/tests/f06_transfers_*.sql`, `tests/e2e/f06-transfers.yaml`

**Consumes:** F02–F05.  
**Produces:** atomic transfer, category split, balance adjustment, reversal, period lock; dipakai F12, F14, F17.

- [ ] Implementasikan same-currency transfer sebagai satu header + dua account lines; fee sebagai expense entry terpisah.
- [ ] Implementasikan 2–20 category split, balance adjustment, reversal/reference, dan period lock error.
- [ ] Test partial-write rollback, same-account reject, fee linkage, split rounding, locked period, reversal idempotency, restricted source/destination, dan double-submit.
- [ ] Integration gate: F17 dapat menambahkan explicit FX amounts tanpa mengubah transfer source of truth.

### Task F17: Multi-Currency

**Files:** `apps/mobile/src/features/currency/`, `packages/domain/src/money/`, `packages/data/src/exchange-rates/`, `supabase/tests/f17_currency_*.sql`, `tests/e2e/f17-multi-currency.yaml`

**Consumes:** F02, F03, F05, F06.  
**Produces:** currency metadata, immutable rate snapshot, reporting amount, partial-FX state; dipakai dashboard, reports, planning, debt, import, and connections.

- [ ] Implementasikan exponent-aware parsing/formatting, stored/manual rate, exact rounding boundary, cross-currency transfer review, dan missing/stale rate UI.
- [ ] Pastikan original amount/currency immutable; reporting amount tidak menjadi ledger source kedua.
- [ ] Test JPY/IDR/decimal currencies, rate inversion, rounding, missing/stale rate, manual snapshot immutability, and partial aggregate.
- [ ] Integration gate: F09/F10 golden totals sama untuk local dan server calculation.

### Task F18: Offline-First Synchronization

**Files:** `apps/mobile/src/features/sync/`, `packages/sync/src/`, `packages/data/src/repositories/`, `supabase/tests/f18_sync_*.sql`, `tests/e2e/f18-offline-sync.yaml`

**Consumes:** F01–F06 dan F17 contracts.  
**Produces:** SQLCipher mirror, outbox, push/pull, conflict, dedupe, purge directive; wajib digunakan semua fitur berikutnya.

- [ ] Implementasikan atomic local write + outbox, user/household cursor, exponential retry, dedupe, version conflict, tombstone, and resume-safe sync lease.
- [ ] Implementasikan purge account/household saat permission/membership revoke sebelum data dapat dirender lagi.
- [ ] Migrasikan repository F01–F06/F17 ke sync framework dan hapus online-only shortcuts.
- [ ] Test airplane-mode mutations, reconnect ordering, app kill, duplicate replay, concurrent edits, revoked access, key loss, corrupted cursor, and 10k-change batch.
- [ ] Integration gate: F07/F08 confirmation bekerja offline dan menyinkron tepat sekali.

### Task F07: Receipt Scan dan OCR

**Files:** `apps/mobile/src/features/receipt/`, `packages/domain/src/receipt/`, `packages/data/src/receipt/`, `supabase/tests/f07_receipt_*.sql`, `tests/e2e/f07-receipt.yaml`

**Consumes:** F01–F05, F17, F18.  
**Produces:** on-device receipt draft, confirmed extraction, optional private attachment; dipakai F16 review/search.

- [ ] Implementasikan permission, camera/gallery/PDF, crop/compress, on-device OCR/parser, correction, and F05 confirmation.
- [ ] Upload private attachment hanya setelah posted confirmation dan `keep_image=true`; `keep_image=false` tidak membuat attachment row/object.
- [ ] Test real-device OCR corpus, rotated/blurred/large receipt, PDF page cap, subtotal/tax/discount math, offline capture, cancel/TTL cleanup, signed URL auth, and no-network OCR capture.
- [ ] Integration gate: confirmed receipt muncul satu kali di F05 ledger dan dapat ditemukan F16 tanpa raw OCR storage.

### Task F08: Voice Entry

**Files:** `apps/mobile/src/features/voice/`, `packages/domain/src/voice/`, `packages/data/src/aliases/`, `supabase/tests/f08_voice_*.sql`, `tests/e2e/f08-voice.yaml`

**Consumes:** F01–F05, F17, F18.  
**Produces:** on-device speech/parser draft and confirmed ledger entry; dipakai F16 review/search.

- [ ] Implementasikan permission, listening lifecycle, local transcript parser, Indonesian number/date parsing, alias resolution, ambiguity review, and F05 confirmation.
- [ ] Raw audio/transcript/intent tetap local; purge saat confirm/cancel atau maksimum 24 jam; tidak ada server voice table.
- [ ] Test utterance corpus, permission deny, interruption, two amounts/directions, ambiguous alias, relative date, offline confirm, process kill, TTL cleanup, and zero capture network traffic.
- [ ] Integration gate: voice-created entry identik dengan manual entry contract dan F09 totals.

### Task F09: Dashboard dan Daily Summary

**Files:** `apps/mobile/src/features/dashboard/`, `packages/domain/src/dashboard/`, `packages/data/src/dashboard/`, `supabase/tests/f09_dashboard_*.sql`, `tests/e2e/f09-dashboard.yaml`

**Consumes:** F03–F08, F17, F18.  
**Produces:** daily balance/cash-flow summary and dashboard navigation; dipakai F10, F11, F15, F19, F21.

- [ ] Implementasikan permission-scoped local aggregate, period switcher, pending/cleared display, partial-FX label, and rebuildable snapshot.
- [ ] Exclude transfer from income/expense; include fee expense; respect refund/reversal and hidden accounts.
- [ ] Test golden ledger fixtures, timezone boundary, pending toggle, refund/reversal, transfer fee, partial FX, restricted account, offline snapshot, and stale-cache purge.
- [ ] Integration gate: F10 same-period totals sama persis dengan dashboard definition.

### Task F10: Reports, Cash Flow, dan Net Worth

**Files:** `apps/mobile/src/features/reports/`, `packages/domain/src/reports/`, `packages/data/src/reports/`, `supabase/tests/f10_reports_*.sql`, `tests/e2e/f10-reports.yaml`

**Consumes:** F03–F09 dan F17.  
**Produces:** report calculators, drill-down, presets, net-worth snapshots; dipakai F11, F14, F15, F21.

- [ ] Implementasikan cash-flow/category/net-worth/trend calculators, presets, drill-down, partial permission/FX state, and local/server parity checks.
- [ ] Derived snapshots dapat dibuang/rebuild dan scoped per subject/access version.
- [ ] Test golden monthly/yearly reports, hidden account, asset valuation, liability sign, missing rate, DST/business date, large dataset, and snapshot rebuild.
- [ ] Integration gate: F11 actual spend dan F14 outstanding explanations memakai canonical report selectors.

### Task F11: Budgets

**Files:** `apps/mobile/src/features/budgets/`, `packages/domain/src/budgets/`, `packages/data/src/budgets/`, `supabase/tests/f11_budgets_*.sql`, `tests/e2e/f11-budgets.yaml`

**Consumes:** F04, F05, F09, F10, F17, F18.  
**Produces:** allocations, budget periods, actual/remaining, threshold events; dipakai F13, F15, F19, F21.

- [ ] Implementasikan budget/line/category allocation, period materialization, zero-sum adjustment, carry policy, and permission-scoped actuals.
- [ ] Budget summaries derived; transfer excluded, expense/refund handled consistently, partial account access disclosed.
- [ ] Test category overlap, allocation sum, adjustment rollback, period rollover, refund, hidden account partials, FX conversion, offline edit/conflict, and threshold hysteresis input.
- [ ] Integration gate: F15 consumes committed budget without duplicating ledger actuals; F19 receives dedupe-ready threshold event.

### Task F12: Goals dan Sinking Funds

**Files:** `apps/mobile/src/features/goals/`, `packages/domain/src/goals/`, `packages/data/src/goals/`, `supabase/tests/f12_goals_*.sql`, `tests/e2e/f12-goals.yaml`

**Consumes:** F03, F05, F06, F11, F17, F18.  
**Produces:** goal links, contributions/withdrawals, progress and milestones; dipakai F15, F19, F21.

- [ ] Implementasikan goal lifecycle, multi-account links, contribution allocation to account split, withdrawals, target history, and milestone events.
- [ ] Progress derived dari ledger/link; allocation tidak boleh melebihi absolute account-line amount.
- [ ] Test multiple goals per split, over-allocation reject, transfer linking, withdrawal, FX missing/converted, restricted account, offline conflict, and milestone dedupe.
- [ ] Integration gate: F15 forecast includes scheduled goal plan without counting contribution twice.

### Task F13: Recurring Bills dan Subscriptions

**Files:** `apps/mobile/src/features/recurring/`, `packages/domain/src/recurring/`, `packages/data/src/recurring/`, `supabase/tests/f13_recurring_*.sql`, `tests/e2e/f13-recurring.yaml`

**Consumes:** F02–F05, F11, F17–F18.  
**Produces:** versioned schedule, occurrences, reminders, match/post workflow; dipakai F14, F15, F19.

- [ ] Implementasikan deterministic recurrence engine, rule versions, generation, estimated amount modes, match/review, skip/snooze/pause/end.
- [ ] Occurrence tidak menjadi ledger sampai explicit/authorized post; scheduler idempotent.
- [ ] Test month-end, leap year, timezone/DST, version edit, duplicate scheduler, estimate sample, auto-match thresholds, restricted account, offline review, and skip/snooze.
- [ ] Integration gate: F15 calendar occurrence dates dan F19 reminder keys sama dengan F13 source version.

### Task F14: Debts dan Loans

**Files:** `apps/mobile/src/features/debts/`, `packages/domain/src/debts/`, `packages/data/src/debts/`, `supabase/tests/f14_debts_*.sql`, `tests/e2e/f14-debts.yaml`

**Consumes:** F03, F05, F06, F10, F13, F17.  
**Produces:** debt terms, ledger-link projection, payment groups, statement/schedule view; dipakai F15 dan F21.

- [ ] Implementasikan debt shell/terms, linked draws/payments, component entry groups, statement-assisted flow, and payoff projection with disclaimer.
- [ ] Debt tables tidak menyimpan running balance/cash-flow kedua; actuals selalu dari canonical entry/split links.
- [ ] Test liability signs, principal/interest/fee grouping, duplicate link reject, statement reconciliation, term changes, FX, restricted account, and projection disclaimers.
- [ ] Integration gate: F10 net worth dan F15 forecast reconcile dengan debt detail untuk fixture yang sama.

### Task F15: Financial Calendar dan Forecast

**Files:** `apps/mobile/src/features/forecast/`, `packages/domain/src/forecast/`, `packages/data/src/forecast/`, `supabase/tests/f15_forecast_*.sql`, `tests/e2e/f15-forecast.yaml`

**Consumes:** F09, F11–F14, F17.  
**Produces:** unified calendar events, forecast scenarios, low-balance explanations; dipakai F19 dan F21.

- [ ] Implementasikan calendar merge, accessible starting balances, recurring/budget/goal/debt projections, scenario overrides, and rebuildable cache.
- [ ] Forecast dipisahkan jelas dari actual; hidden account tidak boleh bocor melalui totals, flags, atau event count.
- [ ] Test date precedence, scenario isolation, low-balance crossing, missing FX, permission partials, cache rebuild, timezone change, and long-range performance.
- [ ] Integration gate: F19 schedule/alerts dan F21 insight source references menunjuk event version yang benar.

### Task F16: Search, Review, Duplicate, dan Reconciliation

**Files:** `apps/mobile/src/features/review/`, `packages/domain/src/reconciliation/`, `packages/data/src/search/`, `supabase/tests/f16_review_*.sql`, `tests/e2e/f16-reconciliation.yaml`

**Consumes:** F03–F10, F13, F17–F18.  
**Produces:** authorized search, review inbox, duplicate resolution, finalized reconciliation; dipakai F20 dan F22.

- [ ] Implementasikan local/server search parity, saved search, review item lifecycle, duplicate compare/resolve, reconciliation snapshot/finalize/reopen/stale.
- [ ] Search index dan snapshots derived; every result re-checks account access.
- [ ] Test filters/cursors, OCR/voice/recurring sources, duplicate false positive, reconciled balance equation, stale version, forbidden entry, revoke purge, and large dataset.
- [ ] Integration gate: F20 imported rows dan F22 staged transactions masuk review/reconciliation melalui contract yang sama.

### Task F20: Import, Export, dan Backup Workflow

**Files:** `apps/mobile/src/features/import-export/`, `packages/domain/src/import-export/`, `packages/data/src/import-export/`, `supabase/tests/f20_import_export_*.sql`, `tests/e2e/f20-import-export.yaml`

**Consumes:** F03–F06, F16–F18.  
**Produces:** safe import staging/commit and export job; dipakai F24 privacy export dan F22 onboarding/reconciliation.

- [ ] Implementasikan CSV import parse/map/validate/preview, row error, duplicate review, atomic batch commit, financial export, and privacy-export job foundation.
- [ ] Formula injection neutralization, file/type/size limits, temporary private Storage TTL, and no direct staging-to-ledger write.
- [ ] Test malicious CSV, encoding/locale, 10k rows, partial invalid rows, duplicate mapping, cancelled/retried job, cross-household file, export step-up hook, and round trip.
- [ ] Integration gate: imported/staged entries masuk F16; F24 dapat memanggil export job dengan recent auth.

### Task F23: Household Sharing

**Files:** `apps/mobile/src/features/household/`, `packages/domain/src/household/`, `packages/data/src/household/`, `supabase/tests/f23_household_*.sql`, `tests/e2e/f23-household.yaml`

**Consumes:** F01, F03–F05, F16, F18, F20.  
**Produces:** invites, roles, per-account permissions, revoke/purge workflow, shared audit; dipakai F24/F19 and all permission-aware consumers.

- [ ] Implementasikan invite/join/expire/revoke, owner/admin/member roles, account capability editor, ownership transfer, and audit view.
- [ ] Setelah permission revoke, server read berhenti dan local purge selesai sebelum UI kembali menampilkan data.
- [ ] Run full F03–F20 permission regression untuk owner/admin/member/restricted/revoked/cross-household matrix.
- [ ] Test invite replay/expiry, last-owner protection, privilege escalation, partial aggregates, deep links, offline revoke, and shared account deletion implications.
- [ ] Integration gate: F24 delete-account flow dapat menentukan transfer ownership/shared retention dengan benar.

### Task F24: Security, Privacy, dan Account Controls

**Files:** `apps/mobile/src/features/security/`, `packages/domain/src/privacy/`, `packages/data/src/privacy/`, `supabase/tests/f24_security_*.sql`, `tests/e2e/f24-security-privacy.yaml`

**Consumes:** F01, F18, F20, F23 dan security skeleton Stage 0.  
**Produces:** app lock, privacy mode, session/device controls, consent, export/delete lifecycle; dipakai F19, F21, F22.

- [ ] Implementasikan biometric/device-credential app lock, privacy mode, sensitive recent-app snapshot, sessions, consent ledger, export step-up, correction/delete request.
- [ ] Implementasikan Day 0 disable/revoke, 7-day grace/cancel, active purge, provider commands, and backup Day-30 guarantee contract.
- [ ] Test app background/reboot, biometric unavailable, session revoke, analytics/AI consent withdrawal, sole-owner delete, shared household delete, export recent auth, purge/restore drill, and log redaction.
- [ ] Integration gate: F19 notification/widget privacy, F21 AI consent, dan F22 connection consent/revoke tunduk pada policy yang sama.

### Task F19: Notifications, Widgets, dan Shortcuts

**Files:** `apps/mobile/src/features/notifications/`, `packages/domain/src/notifications/`, `packages/data/src/notifications/`, native widget/config files, `supabase/tests/f19_notifications_*.sql`, `tests/e2e/f19-notifications.yaml`

**Consumes:** F09, F11–F15, F24.  
**Produces:** privacy-safe scheduler, notification delivery, widget and capture shortcuts.

- [ ] Implementasikan preferences, quiet hours, scheduler/delivery/snooze dedupe, authorized deep links, invalid-token cleanup, and timezone reschedule.
- [ ] Implementasikan widget privacy default and shortcuts to F05/F07/F08 confirmation; native changes require new EAS binary.
- [ ] Test duplicate worker runs, DST/timezone, quiet hours, revoked session, hidden amount, locked device, stale deep link, notification tap authorization, and invalid token.
- [ ] Integration gate: budget/goal/recurring/forecast events menghasilkan tepat satu privacy-safe delivery.

### Task F21: AI Insights dan Assistant

**Files:** `apps/mobile/src/features/ai/`, `packages/domain/src/insights/`, `packages/data/src/ai/`, Supabase Edge Function/tool files, `supabase/tests/f21_ai_*.sql`, `tests/e2e/f21-ai.yaml`

**Consumes:** F09–F15, F17, F24.  
**Produces:** consented insight/chat workflow with source explanations; tidak membuat financial truth baru.

- [ ] Implementasikan explicit opt-in, deterministic precomputed insight candidates, assistant tools on authorized aggregates, source citations, feedback, retention, and delete/revoke.
- [ ] Model tidak menerima raw receipt/audio, hidden-account aggregates, provider secrets, or unrestricted SQL; prompt/tool metadata redacted.
- [ ] Test consent absent/revoked, hallucinated mutation request, tool authorization, prompt injection in merchant/note, source mismatch, missing FX, delete retention, rate/cost limits, and provider outage.
- [ ] Integration gate: every insight can open authorized F09–F15 source; no automated money movement/advice claim.

### Task F22: Bank dan E-Wallet Sync

**Files:** `apps/mobile/src/features/connections/`, `packages/domain/src/connections/`, `packages/data/src/connections/`, provider adapter/Edge Function files, `supabase/tests/f22_connections_*.sql`, `tests/e2e/f22-bank-sync.yaml`

**Consumes:** F03–F05, F16–F18, F20, F24.  
**Produces:** provider connection, sanitized external account, staged transaction, reconciliation link, consent/revoke lifecycle.

- [ ] Implement provider-agnostic adapter, per-provider consent, token vault boundary, webhook verification/replay protection, cursor sync, external account mapping, staging, and F16 reconciliation.
- [ ] External transaction tidak menjadi ledger sampai explicit/authorized reconcile RPC; provider token tidak selectable client.
- [ ] Test mocked provider auth, token refresh/revoke, webhook replay/out-of-order, cursor recovery, duplicate external ID, correction/deletion event, wrong household mapping, consent revoke, provider outage, and staged-to-ledger idempotency.
- [ ] Integration gate: full journey provider → staging → review → canonical ledger → dashboard/report passes without duplicate transaction.

---

## 4. Feature Closure Record

Setelah setiap task selesai, tambahkan record berikut ke delivery log:

```markdown
### Fxx Closure

- Status: DONE
- Commit: catat output exact `git rev-parse --short HEAD`
- Migration(s): catat seluruh filename migration yang diterapkan
- Unit/component: catat jumlah test passed dan total
- pgTAP/contract: catat jumlah test passed dan total
- Maestro/device: catat nama journey, OS, dan device
- Dependency regression: catat seluruh feature ID yang dijalankan
- Consumer edges verified: catat seluruh feature ID tujuan yang diverifikasi
- Security/privacy review: PASS
- Known non-blocking risks: tulis `none` atau daftar issue ID yang eksplisit
```

Jangan mengisi record dengan “akan dites saat QA”. Missing evidence berarti fitur belum selesai.
