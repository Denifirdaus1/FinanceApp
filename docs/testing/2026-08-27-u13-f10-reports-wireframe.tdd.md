# U13 / F10 Reports Wireframe — TDD Evidence

Tanggal: 2026-08-27

Scope: frontend-only deterministic report fixtures; U14/F11 belum dimulai.

## RED checkpoint

Command:

```text
pnpm --filter @financeapp/mobile exec jest --runInBand src/screens/reports/__tests__/reports-wireframe.test.tsx --forceExit
```

Exit code: `1`; Jest gagal tepat pada `Cannot find module '../reports-wireframe'` dan `0 tests` berjalan. RED checkpoint: `fe0f174 test: add U13 F10 reports wireframe contracts`.

## GREEN

Targeted command:

```text
pnpm --filter @financeapp/mobile exec jest --runInBand src/screens/reports/__tests__/reports-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/reports/reports-fixture.ts --collectCoverageFrom=src/screens/reports/reports-wireframe.tsx --forceExit
```

Exit code: `0`; `1 suite`, `12 tests` passed. Coverage gabungan fixture + wireframe: **96.52% statements / 88.57% branches**.

Covered: F10 manifest/authenticated route, cashflow/net-worth BigInt math, ranges/comparison/granularity/timezone, atomic filters, committed/refund/internal-transfer semantics, zero-baseline change, accessible chart table/drill-down/methodology, missing FX, loading/empty/offline/stale/coverage/partial/invalid/too-large/permission/kill-switch/export states, preset/export fixture lifecycle, privacy masking, no network/logging, 320dp, reduced motion, and regression-safe controls.

## Full local gates

| Command | Exit | Result |
|---|---:|---|
| `pnpm install --frozen-lockfile` | 0 | lockfile current |
| `pnpm format:check` | 0 | all files formatted |
| `pnpm lint` | 0 | clean |
| `pnpm typecheck` | 0 | all workspace packages clean |
| `pnpm test:unit` | 0 | mobile 24 suites / 258 tests; domain 15; sync passed; contracts 18 |
| `pnpm test:contract` | 0 | 4 suites / 18 tests |
| `pnpm test:coverage:u00` | 0 | 1 suite / 22 tests; 87.92% statements / 81.85% branches |
| `pnpm audit --audit-level high` | 0 | one existing moderate advisory |
| `npx expo config --type public` | 0 | valid public config |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0 | Android bundle + metadata generated, temporary output removed |
| `git diff --check` | 0 | clean |
| staged-equivalent secret scan | 0 | clean |

## Scope/security review

- Reused U00 primitives and existing authenticated Expo Router Reports tab; no guard, provider, bootstrap, dashboard, capture, or sync boundary changes.
- Money stays canonical minor-unit strings and uses `formatMoney(BigInt(...))`; transfer/refund/committed/missing-FX semantics remain explicit and no 1:1 fallback is used.
- Privacy mode masks visual and accessibility values. Route drill-down carries only `/transactions`; no amount, date, definition, merchant, category, tag, account/resource ID, CSV content, token, or credential is logged or placed in navigation data.
- Export is preview-only fixture behavior: no file I/O, share sheet, network, persistence, Supabase, SQL, or analytics.
- A subset reran U12 Home/dashboard and sync regression paths; no U12 source was changed.

Known deferred work: real local read model, SQLCipher/RPC/RLS, live FX/report aggregation, actual chart package, pagination, encrypted CSV handling, and production export/share flow.
