# U14 / F11 Budgets Wireframe — TDD Evidence

Tanggal: 2026-08-27
Scope: frontend-only deterministic fixture wireframe. Tidak ada database, Supabase, network, persistence, notification, atau native dependency.

## RED

Command:

```text
pnpm --dir apps/mobile test:unit -- src/screens/budgets/__tests__/budgets-wireframe.test.tsx --forceExit
```

Result: exit 1. Jest gagal sesuai harapan karena `Cannot find module '../budgets-wireframe'` sebelum implementasi tersedia.

Checkpoint RED: `f8484faadaf760bee257b58f1b6ab4b6a135327a` (`test: add U14 F11 budgets wireframe contracts`).

## GREEN dan targeted coverage

Command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/budgets/__tests__/budgets-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/budgets/budgets-fixture.ts --collectCoverageFrom=src/screens/budgets/budgets-wireframe.tsx --forceExit
```

Result: exit 0, 1 suite dan 13/13 test passed.

Targeted coverage gabungan fixture + wireframe:

- Statements: 90.65%
- Branches: 89.77%
- Functions: 87.32%
- Lines: 91.13%

## Full gates

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm test:unit` | exit 0; 25 suites, 271 tests passed |
| `pnpm test:contract` | exit 0; 4 suites, 18 tests passed |
| `pnpm test:coverage:u00` | exit 0; 22 tests passed |
| `pnpm audit --audit-level high` | exit 0; 1 moderate advisory existing |
| `npx expo config --type public` | exit 0 |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | exit 0; Android bundle dan metadata.json generated |
| `git diff --check` | exit 0 |

Export smoke output berada pada path ignored `apps/mobile/.expo-smoke-dist`; tidak termasuk perubahan U14.

## Scope and security review

- Perubahan terbatas pada route Planning budget, hidden Expo Router registration, screen fixture, test, dan evidence ini.
- Semua nominal memakai string minor unit/BigInt dan `formatMoney`; tidak ada floating-point money calculation.
- Privacy mode memakai `SensitiveValue` dan menyembunyikan visual serta accessibility value.
- Drill-down hanya menggunakan route statis `/transactions`; tidak ada data budget, kategori, nominal, tanggal, atau identifier pada URL/log.
- Fixture tidak memanggil `fetch`, Supabase, persistence, SQL, analytics, atau file/share API.
- Semua CTA utama memberi state/result deterministik: create, copy, pause, archive, restore, retry, refresh, wizard, detail, drill-down, privacy, dan rollover preview.

## Deferred

Rollover persistence, real alert scheduling, ledger/query integration, FX conversion, sync transport, and transaction drill-down data remain intentionally deferred to later tasks.
