# U18 / F15 Calendar & Forecast Wireframe — TDD Evidence

Date: 2026-08-28
Scope: frontend-only Expo Router wireframe with deterministic in-memory fixtures. No tracker, database, Supabase, network, persistence, native dependency, EAS, or Maestro changes.

## RED checkpoint

Command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/forecast/__tests__/forecast-wireframe.test.tsx --forceExit
```

Result: exit 1. The suite could not resolve the not-yet-created `../forecast-wireframe` module and executed 0 tests.

RED commit: `211d5f1 test: add U18 F15 calendar forecast wireframe contracts`

## GREEN verification

Targeted command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/forecast/__tests__/forecast-wireframe.test.tsx --forceExit
```

Result: exit 0, 1 suite and 21 tests passed.

Targeted coverage command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/forecast/__tests__/forecast-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/forecast/forecast-fixture.ts --collectCoverageFrom=src/screens/forecast/forecast-wireframe.tsx --forceExit
```

Result: exit 0. Combined coverage: 90.00% statements, 82.65% branches. Fixture: 96.55% statements / 83.33% branches. Wireframe: 82.69% statements / 82.00% branches.

## Gate evidence

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm lint` | exit 0, 0 errors and 0 warnings for U18 |
| `pnpm typecheck` | exit 0 |
| `pnpm test:unit` | exit 0, 29 suites / 354 tests passed |
| `pnpm test:contract` | exit 0, 4 suites / 18 tests passed |
| `pnpm test:coverage:u00` | exit 0, 1 suite / 22 tests passed; 87.92% statements / 81.85% branches |
| `pnpm audit --audit-level high` | exit 0; one pre-existing moderate advisory reported |
| `npx expo config --type public` (apps/mobile) | exit 0 |
| `npx expo export --platform android --output-dir .expo-smoke-dist` (apps/mobile) | exit 0; `metadata.json` exported |
| `git diff --check` | exit 0 |

## Scope and security review

- F15 manifest path `/planning/forecast` is registered as a hidden authenticated Planning route and has a visible Planning entry.
- Calendar, agenda, forecast horizon, pending visibility, filter, scenario, retry, privacy, event detail, and safe transaction drill-down controls produce visible deterministic results.
- Fixtures cover loading, empty, offline, stale, partial FX, orphan, conflict, recomputing, unauthorized, kill-switch, no-projected, and overdue states; actual/projected legend is textual and non-color dependent.
- Money remains an integer minor-unit string and uses the existing formatter. Internal transfer consolidation is zero while per-account provenance remains explicit. Missing FX is partial, never zero or 1:1.
- Scenario overrides are in-memory fixture state and do not mutate base data; actual event drag is rejected and projected drag becomes a scenario override.
- No `fetch`, Supabase import, SQL, persistence, file I/O, analytics, credential, sensitive URL parameter, or production logging was added. The test spies on `fetch`/`console.log` only to assert they are not called.
- Layout constants preserve 320dp minimum width and 48dp minimum touch targets; reduced motion and privacy masking reuse existing U00 primitives.

## Deferred risks

Real calendar aggregation, encrypted persistence, sync/RPC integration, live FX/provider provenance, server authorization, notification scheduling, and production drill-down query contracts remain intentionally deferred. U19/F16 was not started.
