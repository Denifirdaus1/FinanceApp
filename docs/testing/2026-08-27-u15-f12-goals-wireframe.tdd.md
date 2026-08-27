# U15 / F12 Goals & Sinking Funds — TDD Evidence

Tanggal: 2026-08-27
Scope: frontend-only deterministic fixture wireframe. Tidak ada database, Supabase, network, persistence, notification scheduler, atau native dependency.

## RED

Command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/goals/__tests__/goals-wireframe.test.tsx --forceExit
```

Result: exit 1. Jest gagal sesuai harapan dengan `Cannot find module '../goals-wireframe'` sebelum implementasi tersedia.

RED checkpoint: `b8a14b34336f385a3d19a80a9c5f4884a5660d1e` (`test: add U15 F12 goals wireframe contracts`).

## GREEN dan targeted coverage

Command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/goals/__tests__/goals-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/goals/goals-fixture.ts --collectCoverageFrom=src/screens/goals/goals-wireframe.tsx --forceExit
```

Result: exit 0, 1 suite dan 10/10 test passed.

Targeted coverage fixture + wireframe:

- Statements: 92.00%
- Branches: 90.54%
- Functions: 90.00%
- Lines: 92.65%

## Full gates

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm test:unit` | exit 0; 26 suites, 281 tests passed |
| `pnpm test:contract` | exit 0; 4 suites, 18 tests passed |
| `pnpm test:coverage:u00` | exit 0; 22 tests passed |
| `pnpm audit --audit-level high` | exit 0; 1 moderate advisory existing |
| `npx expo config --type public` | exit 0 |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | exit 0; Android bundle and metadata.json generated |
| `git diff --check` | exit 0 |

## Scope and security review

- Perubahan terbatas pada route Planning goals, hidden Expo Router registration, screen fixture, test, dan evidence ini.
- Money menggunakan canonical minor-unit string/BigInt dan `formatMoney`; tidak ada floating-point money calculation.
- Privacy mode menggunakan `SensitiveValue` dan menyembunyikan nominal visual serta accessibility value.
- Drill-down hanya menuju route statis `/transactions`; tidak ada goal name, nominal, deadline, account ID, transaction ID, atau note pada URL/log.
- Fixture tidak memanggil fetch, Supabase, SQL, persistence, analytics, file/share, atau notification API.
- CTA create/copy/pause/complete/archive/reopen/reorder, wizard, detail/history, allocation, withdrawal, retry, refresh, privacy, reminder, dan drill-down menghasilkan hasil fixture yang terlihat.

## Deferred

Ledger allocation persistence, FX conversion, real sync/outbox, account permission enforcement, reminder scheduling, and production notification behavior tetap ditunda ke task berikutnya.
