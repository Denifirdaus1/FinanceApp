# U20 / F17 Multi-Currency Wireframe

Tanggal: 2026-08-28

## RED/GREEN

- RED command: `pnpm --dir apps/mobile exec jest --runInBand src/screens/currency/__tests__/currency-u20-wireframe.test.tsx --forceExit`
- RED exit: `1`
- RED failure: `createMultiCurrencyFixture` belum tersedia; 6 test gagal dan 1 existing conversion test lolos.
- RED checkpoint: `970f397` (`test: add U20 F17 multi currency wireframe contracts`)
- GREEN targeted command: `pnpm --dir apps/mobile exec jest --runInBand src/screens/currency/__tests__/currency-u20-wireframe.test.tsx --forceExit`
- GREEN exit: `0`; U20 7/7 tests passed.

## Targeted coverage

Command gabungan U08 + U20:

`pnpm --dir apps/mobile exec jest --runInBand src/screens/currency/__tests__/currency-wireframe.test.tsx src/screens/currency/__tests__/currency-u20-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/currency/currency-fixture.ts --collectCoverageFrom=src/screens/currency/currency-wireframe.tsx --forceExit`

Exit `0`; 2 suites dan 19 tests passed.

- Combined: 93.77% statements, 88.36% branches.
- `currency-fixture.ts`: 92.82% statements, 86.85% branches.
- `currency-wireframe.tsx`: 96.77% statements, 92.98% branches.

## Implemented scope

- Reused `/planning/currency` and existing F17 route/guard/provider structure.
- Typed currency metadata picker with code, exponent 0/2/3, symbol, and localized name.
- Account currency activity lock, versioned base-currency review, concurrent-change re-review, and immutable original ledger copy.
- Exact BigInt conversion and half-even rounding fixtures, large values, rate validation, historical quote immutability, and import/export provenance round-trip.
- Cross-currency validation, atomic source/destination legs, fee-as-expense separation, idempotent mutation result, and rollback fixtures.
- Missing/stale/offline rate disclosure with no 1:1 fallback and retained manual-rate draft.
- Original/converted report preview with rate provenance and privacy masking.
- Accessible picker, privacy toggle, deterministic recovery CTA, 320dp and reduced-motion support.

## Full gates

Semua exit `0`:

- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- targeted U20 coverage
- `pnpm test:unit`: 31 suites, 382 tests passed
- `pnpm test:contract`: 4 suites, 18 tests passed
- `pnpm test:coverage:u00`: 1 suite, 22 tests passed; 87.92% statements / 81.85% branches
- `pnpm audit --audit-level high`: exit 0; one existing moderate vulnerability reported
- `npx expo config --type public`: exit 0
- `npx expo export --platform android --output-dir .expo-smoke-dist`: exit 0; bundle and metadata generated, then output removed
- `git diff --check`
- staged-equivalent secret scan

## Scope and security review

Perubahan hanya pada existing currency fixture/wireframe, U20 tests, dan evidence. Tidak ada tracker/database/Supabase/backend/API/network/fetch/persistence/native dependency/migration/RLS/RPC/SQLCipher/EAS/Maestro change. Tidak ada nominal atau identifier sensitif pada URL, log, analytics, atau route params. Rate provenance tetap fixture-only; provider nyata, persistence, server validation, dan production import/export tetap deferred.

CI Supabase migration/pgTAP, bila dijalankan, hanya memvalidasi stack lokal ephemeral dan bukan migrasi hosted FinanceApp.

U21 belum dimulai.
