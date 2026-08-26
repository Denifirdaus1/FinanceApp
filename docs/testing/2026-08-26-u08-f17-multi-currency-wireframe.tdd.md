# U08 / F17 Multi-currency Wireframe — TDD Evidence

Date: 2026-08-26
Scope: frontend-only deterministic fixtures and Expo Router wireframe. No tracker, backend, database, Supabase, production network, persistence, EAS, or Maestro changes.

## RED checkpoint

The contract suite was written before implementation and executed with:

```text
pnpm --filter @financeapp/mobile test:unit -- currency-wireframe.test.tsx --runInBand --forceExit
```

Result: exit 1. Jest reported `Cannot find module '../currency-wireframe'`; 0 suites ran. RED commit: `f55ee71 test: add U08 F17 multi-currency wireframe contracts`.

## GREEN evidence

Targeted test: 12/12 tests passed, exit 0.

Targeted coverage for the U08 fixture and wireframe:

| File | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `currency-fixture.ts` | 93.12% | 85.81% | 100% | 98.38% |
| `currency-wireframe.tsx` | 98.24% | 92.45% | 96% | 98.21% |
| Combined | 94.47% | 87.56% | 98.24% | 98.33% |

Covered behaviors include exponent 0/2/3 metadata, immutable account currency, canonical positive rates, exact bigint conversion with half-even rounding, immutable historical quotes, missing/stale/offline rate handling without 1:1 fallback, base preference review/conflict, atomic cross-currency legs, separate fee expense, idempotent retry/rollback, kill switch/read-only state, accessibility, reduced motion, 320dp layout, and Planning/Transfers navigation.

## Full gates

All completed gates exited 0:

- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit` — 19 mobile suites, 197 tests passed
- `pnpm test:contract` — 4 suites, 18 tests passed
- `pnpm test:coverage:u00` — 22 tests passed; 87.92% statements / 81.85% branches
- `pnpm audit --audit-level high` — exit 0; one existing moderate advisory reported
- `npx expo config --type public` — exit 0
- `npx expo export --platform android --output-dir .expo-smoke-dist` — exit 0; Android bundle and metadata exported
- `git diff --check` — exit 0

The Expo smoke export used development placeholder environment values only. No credential was added to source, tests, logs, URLs, or the evidence.

## Scope and review

The F17 route already existed in the typed manifest as `/planning/currency` and remains `WIREFRAME READY`. U08 adds the Planning entry, hidden Expo Router registration, currency fixture/helper, currency screen, and the minimal U07 Transfers handoff CTA. Original amounts and rate provenance remain separate from reporting previews; no financial value or identifier is placed in URLs or logs.

Known risks: the UI remains a fixture-only wireframe; live FX providers, persistence, sync, and server-side validation are intentionally deferred. The audit still reports one pre-existing moderate dependency advisory. U09/F18 was not started and the tracker was not accessed or modified.
