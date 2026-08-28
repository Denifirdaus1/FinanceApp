# U19 / F16 Search, Review & Reconciliation Wireframe

Tanggal: 2026-08-28

## TDD evidence

- RED command: `pnpm --dir apps/mobile exec jest --runInBand src/screens/review/__tests__/search-review-reconciliation-wireframe.test.tsx --forceExit`
- RED exit: `1`
- RED failure: module `../search-review-reconciliation-fixture` belum tersedia.
- RED checkpoint: `d640138` (`test: add U19 F16 search review reconciliation wireframe contracts`)
- GREEN command: sama dengan command RED setelah implementasi.
- GREEN exit: `0`
- GREEN result: 1 suite, 21 tests passed.

## Targeted coverage

Command:

`pnpm --dir apps/mobile exec jest --runInBand src/screens/review/__tests__/search-review-reconciliation-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/review/search-review-reconciliation-fixture.ts --collectCoverageFrom=src/screens/review/search-review-reconciliation-wireframe.tsx --forceExit`

Exit `0`.

- Combined: 98.67% statements, 92.53% branches.
- Fixture: 99.04% statements, 94.48% branches.
- Wireframe: 97.82% statements, 87.50% branches.
- Tests: 21/21 passed.

## Implemented contract

- Authenticated `/transactions/review` route dan entry dari Transactions.
- Local normalized search: NFKC, lowercase, diacritic folding, phrase/prefix matching, deterministic ranking, safe pagination, coverage/indexing states, and allowlisted filters.
- User-only saved-search fixture, review inbox reasons, safe bulk preview/undo, source-change and outbox-race recovery.
- Reconciliation fixture menghitung hanya posted cleared/reconciled lines sampai cutoff; pending/draft/void dikecualikan dan adjustment preview bersifat explicit.
- Offline, unauthorized, stale, corrupt-cursor, empty, no-result, and partial states memiliki CTA deterministic.
- Privacy toggle memakai `SensitiveValue`; navigation tetap static tanpa query payload, amount, identifier, atau tanggal sensitif.
- Tidak ada fetch, network, persistence, Supabase, SQL, analytics, atau logging produksi.
- Layout contract: minimum 320dp, touch target minimum 48dp, reduced-motion copy, accessible labels/roles.

## Full gates

Semua command berikut exit `0`:

- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint` (existing unused-variable warning sudah dihapus; no errors)
- `pnpm typecheck`
- targeted U19 test dan coverage
- `pnpm test:unit`: 30 suites, 375 tests passed
- `pnpm test:contract`: 4 suites, 18 tests passed
- `pnpm test:coverage:u00`: 1 suite, 22 tests passed; 87.92% statements / 81.85% branches
- `pnpm audit --audit-level high`: exit 0; satu moderate vulnerability existing tetap dilaporkan
- `npx expo config --type public`: exit 0
- `npx expo export --platform android --output-dir .expo-smoke-dist`: exit 0; Android bundle dan `metadata.json` dibuat, lalu output sementara dibersihkan
- `git diff --check`
- staged-equivalent secret scan

## Scope and security review

Perubahan terbatas pada route review, CTA Transactions, typed fixture, wireframe, test, dan evidence U19. Tidak ada perubahan tracker/database/backend/package data/sync/domain/native dependency. Entity labels, query, nominal, tanggal detail, dan internal IDs tidak dimasukkan ke URL, log, analytics, atau snapshot sensitif. Reconciliation finalization dan persistence production tetap deferred.

Deferred: local FTS/index production, durable saved-search storage, server review/reconciliation RPC, real permission enforcement, and production outbox/sync transport.

U20 belum dimulai dan tracker/database tidak disentuh.
