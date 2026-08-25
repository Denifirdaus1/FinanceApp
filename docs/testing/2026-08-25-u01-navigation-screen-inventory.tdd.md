# U01 Navigation & Screen Inventory — TDD Evidence

## Source plan

- `docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md`
- Scope is limited to U01 navigation foundation. No U02 feature wireframe, auth implementation, business transaction logic, database, migration, RPC, RLS, Storage policy, or Edge Function was added.

## User journeys

1. As a signed-in user, I want five predictable primary tabs so that I can move between the product areas without losing the existing session guard.
2. As a signed-in user, I want a global capture action so that adding a transaction opens a deterministic fixture flow instead of a dead button.
3. As a user following a safe app deep link, I want supported references to resolve to the correct screen without placing financial state in the URL.
4. As a product/design reviewer, I want a complete F01–F24 screen catalog with explicit readiness status so that later wireframe work has a stable navigation inventory.

## RED/GREEN evidence

| Stage | Command | Result |
|---|---|---|
| RED | `pnpm --filter @financeapp/mobile test:unit -- navigation-foundation.test.tsx` before implementation | Failed on the intended missing production module `../route-manifest`; no unrelated setup failure. |
| GREEN | Same targeted command after implementation | 2 suites, 8 tests passed after adding the bottom navigation contract. |
| Regression GREEN | `pnpm test:unit` | 12 suites, 87 tests passed; existing bootstrap, public/app guard, providers, error boundary, and E2E session override tests passed. |

## Test specification

| Guarantee | Test target | Result |
|---|---|---|
| Manifest covers F01–F24 with unique feature IDs, route IDs, and paths | `navigation-foundation.test.tsx` | PASS |
| Bottom tabs are Home, Transactions, Planning, Reports, Profile in order | `navigation-foundation.test.tsx` | PASS |
| Global capture action is accessible, navigates to `/capture`, and returns a deterministic mock result | `navigation-foundation.test.tsx` | PASS |
| Bottom navigation exposes five tab buttons plus a separate capture action and routes tab presses | `bottom-navigation.test.tsx` | PASS |
| Six deep-link types resolve to the intended route without reference IDs in paths | `navigation-foundation.test.tsx` | PASS |
| Invalid, malformed, path-traversal, query-bearing, and unknown deep links are rejected | `navigation-foundation.test.tsx` | PASS |
| Screen catalog mirrors all manifest entries and uses only valid readiness statuses | `navigation-foundation.test.tsx` | PASS |
| Existing auth/bootstrap behavior does not regress | `src/app/__tests__/bootstrap.test.tsx` | PASS |
| Android Expo export has no duplicate-route warning | `npx expo export --platform android` | PASS |

## Coverage and quality gates

- U00 coverage gate: 22 tests passed; 87.92% statements, 81.85% branches, 83.69% functions, 87.86% lines.
- `pnpm install --frozen-lockfile`: PASS.
- `pnpm format:check`: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test:unit`: PASS.
- `pnpm test:contract`: PASS; 4 suites and 18 tests.
- `pnpm audit --audit-level high`: exit 0; one existing moderate advisory remains below the requested high threshold.
- `npx expo config --type public`: PASS.
- `npx expo export --platform android`: PASS; no duplicate-route warning.
- `git diff --check`: PASS.

## Merge evidence and known gaps

- RED checkpoint: `5c048c4` (`test: add U01 navigation foundation contracts`).
- GREEN checkpoint: `1cb4456` (`fix: implement U01 navigation foundation`).
- Final delivery commit and CI URL are recorded in the task handoff after normal push.
- Maestro cloud/device testing and paid EAS build remain intentionally deferred by project scope.
- Deep-link targets are typed foundation routes; feature-specific screen behavior remains deferred to U02+.
