# U25 / F22 — Bank & E-Wallet Sync Wireframe

Tanggal: 2026-08-28
Scope: frontend-only deterministic fixtures. Tidak ada provider SDK, OAuth nyata, network, persistence,
Supabase, database, migration, tracker write, atau native integration.

## TDD evidence

- RED command: `pnpm --dir apps/mobile exec jest --runInBand src/screens/connections/__tests__/connections-u25-wireframe.test.tsx --forceExit`
- RED result: exit 1; suite berhenti karena `../connections-wireframe` belum tersedia, 0 tests executed.
- RED checkpoint: `abb95a1eac067eee4d7c887b9da5d7a705b13647` — `test: add U25 F22 bank ewallet sync wireframe contracts`.
- GREEN command: targeted Jest dengan `--coverage` dan `--collectCoverageFrom` untuk fixture + wireframe.
- GREEN result: exit 0; 25 tests passed; 98.92% statements, 93.65% branches, 97.91% functions, 98.82% lines.

## Implemented review surface

- Authenticated `/profile/connections` route and Profile entry, with hidden Expo Router registration.
- Read-only consent disclosure, provider/cadence/retention copy, callback states, opaque reference handling,
  discovery/mapping, staging sync progress, health states, stale outage snapshot, replay/cursor recovery,
  reconciliation handoff, duplicate review, pending-to-posted and reversal/refund provenance.
- Explicit disconnect retain/delete fixture choices, CSV fallback, offline read-only snapshot, kill switch,
  retry, safe metadata, back action, reduced-motion copy, 320dp and 48dp accessibility contract.
- Safe fixture output excludes provider payloads and sensitive identifiers. Staging is explicitly not ledger.

## Full gates

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | lockfile current |
| `pnpm format:check` | 0 | all files formatted |
| `pnpm lint` | 0 | clean |
| `pnpm typecheck` | 0 | all workspace packages clean |
| `pnpm test:unit` | 0 | 36 suites, 469 tests |
| `pnpm test:contract` | 0 | 4 suites, 18 tests |
| `pnpm test:coverage:u00` | 0 | 87.92% statements, 81.85% branches |
| `pnpm audit --audit-level high` | 0 | one pre-existing moderate advisory; no high/critical |
| `npx expo config --type public` | 0 | valid public config |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0 | Android bundle exported |
| `git diff --check` | 0 | clean |

Expo emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for `packages/config`; it is unrelated to
U25. The smoke export directory is temporary and must not be committed.

## Scope and security review

Self-review P1/P2: no U26/Stage 2 work, no tracker/database changes, no credentials, tokens, account identifiers,
amounts, balances, merchant data, raw provider payloads, or sensitive route parameters. No fetch/network/logging/
analytics/persistence/provider SDK was added. Real OAuth/PKCE, bank contracts, webhook replay, reconciliation,
ledger materialization, retention deletion, and legal/vendor review remain deferred to Stage 2.

U26 and Stage 2 were not started.
