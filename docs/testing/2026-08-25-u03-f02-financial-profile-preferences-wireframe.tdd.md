# U03 / F02 Financial Profile & Preferences Wireframe — TDD Evidence

Date: 2026-08-25

Scope: fixture-only frontend wireframe; no Supabase Auth, database, persistence, or production network.

## RED checkpoint

- Test added first: `apps/mobile/src/screens/financial-profile/__tests__/financial-profile-wireframe.test.tsx`.
- Expected RED command: `cd apps/mobile && pnpm exec jest --runInBand src/screens/financial-profile/__tests__/financial-profile-wireframe.test.tsx`.
- Result: exit code 1 because `financial-profile-fixture` did not exist yet (`Cannot find module '../financial-profile-fixture'`).
- RED commit: `1f030dd test: add U03 F02 financial profile wireframe contracts`.

## GREEN implementation

- Added typed locale, timezone, currency, date-format, theme, privacy, validation, preview, and deterministic load/save/conflict fixture contracts.
- Added interactive three-step profile wizard with loading, editing, validating, saving-local, offline, sync-pending, synced, conflict, and recovery states.
- Added explicit base-currency confirmation explaining that historical transaction currency and amount are not permanently converted.
- Added Profile route entry and U02 fixture completion callback to `/profile/preferences`; public/app guards, providers, bootstrap, error boundary, and E2E security boundary remain unchanged.
- GREEN implementation commits: `4dd3c1c`, `3249b9c`, `1021723`.

## Test evidence

Targeted U03 suite: 15/15 tests passed.

Covered contracts:

- supported BCP 47 locale, IANA timezone, ISO 4217 currency, week/month bounds, and unknown-value rendering;
- editable defaults, locale/timezone controls, explicit currency confirmation/cancel;
- privacy and analytics controls, edit-again flow, offline/sync-pending/retry, conflict resolution, and save error recovery;
- U02 completion callback, Profile route/back navigation, readiness manifest, no production network/persistence, integer Intl preview formatting;
- accessibility roles/labels/state, reduced motion, 48dp touch target, RTL/text scaling-safe layout constants, and 320dp minimum layout.

Targeted coverage command:

```text
cd apps/mobile
pnpm exec jest --runInBand src/screens/financial-profile/__tests__/financial-profile-wireframe.test.tsx --coverage --collectCoverageFrom="src/screens/financial-profile/**/*.{ts,tsx}"
```

Result: exit code 0; aggregate 83.98% statements, 80.57% branches, 79.22% functions, and 87.87% lines.

## Security boundary

The fixture uses in-memory queues only. Tests spy on `globalThis.fetch` and verify no production network call. No credentials, tokens, private profile data, financial records, database migration, RLS/RPC, storage policy, or analytics production integration was added.
