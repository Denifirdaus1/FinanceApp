# U09 / F18 Offline Sync Wireframe — TDD Evidence

Date: 2026-08-26
Scope: Stage 1 frontend-only interactive wireframe with typed deterministic fixtures. No tracker, backend, database, Supabase, persistence, network, EAS, or Maestro changes.

## RED checkpoint

Contracts were written before implementation and executed with:

```text
pnpm --filter @financeapp/mobile test:unit -- sync-wireframe.test.tsx --runInBand --forceExit
```

Result: exit 1. Jest reported `Cannot find module '../sync-wireframe'`; 0 tests ran. RED commit: `123b1a2 test: add U09 F18 offline sync wireframe contracts`.

## GREEN evidence

Targeted U09 test: 16/16 tests passed, exit 0.

Targeted coverage for the U09 fixture and wireframe:

| File | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `sync-fixture.ts` | 94.59% | 95.83% | 100% | 97.18% |
| `sync-wireframe.tsx` | 96.77% | 96.72% | 89.47% | 96.07% |
| Combined | 95.37% | 96.09% | 94.28% | 96.72% |

Covered behaviors include F18 manifest/Home navigation and auth guard, all sync statuses, safe pending metadata redaction, deterministic retry outcomes for offline/401/403/409/429/5xx/non-retryable, idempotent retry, non-overlap auto-merge, finance-critical amount review, explicit device/server choices, revoked scope lock and safe purge/re-auth, schema-incompatible update/diagnostic flow, kill-switch manual-only path, accessibility, reduced motion, 320dp layout, and no network/logging.

## Full quality gates

All gates exited 0:

- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- targeted U09 test and coverage
- `pnpm test:unit` — 20 mobile suites, 213 tests passed
- `pnpm test:contract` — 4 suites, 18 tests passed
- `pnpm test:coverage:u00` — 22 tests passed; 87.92% statements / 81.85% branches
- `pnpm audit --audit-level high` — exit 0; one existing moderate advisory reported
- `cd apps/mobile && npx expo config --type public` — exit 0
- `cd apps/mobile && npx expo export --platform android --output-dir .expo-smoke-dist` — exit 0; Android bundle and metadata exported
- `git diff --check` — exit 0
- staged-equivalent secret scan — clean

Expo commands used development placeholder environment values only. No credentials were added to source, tests, logs, URLs, or evidence.

## Scope and review

The existing F18 manifest entry `/sync` remains unchanged. U09 adds the authenticated sync route, hidden Expo Router registration, Home entry, typed fixture repository, sync screen, tests, and this evidence. Queue rows expose only entity type/status/retry state/attempts/age bucket; payloads, identifiers, financial values, and tokens are not rendered. The wireframe does not claim real deletion, sync, persistence, or transport.

Known risks: live encrypted local storage, outbox transport, server conflict protocol, revocation purge, and schema migration remain intentionally deferred to later backend/integration work. Expo emits the existing module-type warning, and audit reports the existing moderate advisory; neither caused a gate failure. U10/F07 was not started and the tracker was not accessed or modified.
