# U12 / F09 Dashboard & Summary Wireframe — TDD Evidence

Tanggal: 2026-08-27

Scope: frontend-only deterministic dashboard fixture; U13/F10 belum dimulai.

## RED checkpoint

Command:

```text
pnpm --filter @financeapp/mobile exec jest --runInBand src/screens/dashboard/__tests__/dashboard-wireframe.test.tsx --forceExit
```

Exit code: `1`. Test gagal sesuai ekspektasi karena module `../dashboard-wireframe` belum tersedia; `0 tests` berjalan. Checkpoint: `5f69c09 test: add U12 F09 dashboard wireframe contracts`.

## GREEN

Targeted command:

```text
pnpm --filter @financeapp/mobile exec jest --runInBand src/screens/dashboard/__tests__/dashboard-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/dashboard/dashboard-fixture.ts --collectCoverageFrom=src/screens/dashboard/dashboard-wireframe.tsx --forceExit
```

Exit code: `0`; `1 suite`, `9 tests` passed. Coverage gabungan fixture + wireframe: **86.02% statements / 88.76% branches**. Fixture: 95.74% / 88.88%; wireframe: 76.08% / 88.67%.

Covered contracts: authenticated Home/F09 manifest, period/privacy controls, BigInt-safe money formatting, summary cards/sections, quick-action destinations, loading/empty/offline/stale/partial/missing-FX/session-safe states, deterministic refresh/retry, sync recovery, accessibility layout, and no fetch/logging/sensitive fixture output.

## Full local gates

| Command | Exit | Evidence |
|---|---:|---|
| `pnpm install --frozen-lockfile` | 0 | lockfile current |
| `pnpm format:check` | 0 | all files formatted |
| `pnpm lint` | 0 | clean |
| `pnpm typecheck` | 0 | all workspace packages clean |
| `pnpm test:unit` | 0 | mobile 23 suites / 246 tests; sync 18; domain 15; contracts 18 |
| `pnpm test:contract` | 0 | 4 suites / 18 tests |
| `pnpm test:coverage:u00` | 0 | 1 suite / 22 tests; 87.92% statements / 81.85% branches |
| `pnpm audit --audit-level high` | 0 | one existing moderate advisory |
| `npx expo config --type public` | 0 | valid public config |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0 | Android bundle + metadata generated, then temporary output removed |
| `git diff --check` | 0 | clean |
| staged-equivalent secret scan | 0 | clean |

## Scope/security review

- Reused U00 tokens/primitives and existing authenticated Expo Router app group, providers, guard, tabs, sync route, and global capture paths.
- Money remains canonical minor-unit strings and is formatted through `formatMoney(BigInt(...))`; no floating-point calculation or 1:1 FX fallback.
- Privacy mode masks visual and accessibility money; fixture snapshots contain no merchant, note, resource ID, URL parameter, log, analytics, or network payload.
- Dashboard is deterministic and fixture-only. No Supabase, API, persistence, notification, native dependency, or production analytics changes.
- Existing bootstrap and sync contracts were rerun in a 3-suite regression subset: 35/35 tests passed.

Known risks deferred to later scope: real read-model aggregation, SQLCipher/cache, RPC/RLS, live sync, real FX snapshots, and production app-switcher protection.
