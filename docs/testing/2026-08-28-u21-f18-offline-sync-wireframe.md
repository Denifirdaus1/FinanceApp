# U21 / F18 Offline-First Synchronization Wireframe

Date: 2026-08-28
Scope: frontend-only deterministic fixture wireframe; no tracker, database, Supabase, network, or production sync changes.

## TDD evidence

1. RED contract was added and committed before implementation:
   - Command: `pnpm --dir apps/mobile exec jest --runInBand src/screens/sync/__tests__/sync-u21-wireframe.test.tsx --forceExit`
   - Exit: `1`
   - Failure: `TypeError: createOfflineFirstFixture is not a function`
   - RED commit: `3b54552b7a2264adb8a822c8caa454dff30b5b32`
2. GREEN targeted contract:
   - Command: same targeted Jest command
   - Exit: `0`
   - Result: 1 suite, 11 tests passed.
3. Combined U09 regression + U21 coverage:
   - Command: `pnpm --dir apps/mobile exec jest --runInBand src/screens/sync/__tests__/sync-wireframe.test.tsx src/screens/sync/__tests__/sync-u21-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/sync/sync-fixture.ts --collectCoverageFrom=src/screens/sync/sync-wireframe.tsx --forceExit`
   - Exit: `0`
   - Result: 2 suites, 27 tests passed; 91.62% statements / 89.96% branches overall.
   - `sync-fixture.ts`: 94.48% statements / 91.82% branches.
   - `sync-wireframe.tsx`: 86.58% statements / 85.18% branches.

## Implemented contract

- Typed offline-first scenarios for online, airplane, slow, flapping, stale, partial, lease crash, cursor corruption, missing/corrupt key, revoke, schema incompatibility, and manual-only states.
- Safe queue metadata exposes only entity type/status/retry state/attempts/age bucket plus scope, ordering, and stable idempotency marker; no payload or identifiers.
- Deterministic retry outcomes remain idempotent and cover offline, retry-after, backoff, re-auth, access revoke, conflict review, schema block, manual-only, and atomic rollback paths.
- Disjoint conflict fields can auto-merge; finance-critical amount conflicts require explicit device/server choice and never use blind last-write-wins.
- Revocation, schema update/diagnostic, pull cursor/tombstone recovery, lease/force-close recovery, scope separation, and key/database health are represented without real deletion or persistence.
- `/sync` retains the authenticated route, Home entry, existing guard/provider/error-boundary path, and U09 controls. New recovery and diagnostic actions are accessible and visibly deterministic.

## Full gates

| Gate | Exit/result |
|---|---:|
| `pnpm install --frozen-lockfile` | 0 |
| `pnpm format:check` | 0 |
| `pnpm lint` | 0 |
| `pnpm typecheck` | 0 |
| `pnpm test:unit` | 0; 32 suites / 393 tests |
| `pnpm test:contract` | 0; 4 suites / 18 tests |
| `pnpm test:coverage:u00` | 0; 22 tests; 87.92% statements / 81.85% branches |
| `pnpm audit --audit-level high` | 0; one pre-existing moderate advisory |
| `npx expo config --type public` | 0; SDK 56 config valid |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0; Android metadata, bundle, and assets verified |
| `git diff --check` | 0 |
| scoped secret scan | 0; no credential-like matches |

## Scope and security review

Read-only P1/P2 review found no U22 work, no data-layer changes, no network/fetch/logging, no sensitive queue payload, no financial values or identifiers in navigation, and no weakened authentication or provider boundary. The diagnostic preview is codes/timing only and purge remains explicitly fixture-only (`actualDeletion: false`). U22 was not started; tracker/database were not touched.

## Deferred risks

Production encrypted persistence, real outbox/lease worker, transport retry, cursor storage, key lifecycle, revocation purge, and server conflict protocol remain intentionally deferred to their backend/security tasks.
