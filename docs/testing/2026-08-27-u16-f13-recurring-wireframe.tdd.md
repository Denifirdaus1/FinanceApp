# U16 / F13 Recurring Bills & Subscriptions Wireframe

Date: 2026-08-27
Scope: frontend-only deterministic fixtures; no backend, persistence, network, native scheduler, or payment integration.

## TDD evidence

- RED command: `pnpm --dir apps/mobile exec jest --runInBand src/screens/recurring/__tests__/recurring-wireframe.test.tsx --forceExit`
- RED result: exit `1`; expected failure `Cannot find module '../recurring-wireframe'`.
- RED checkpoint: `b6c29fb` (`test: add U16 F13 recurring wireframe contracts`).
- GREEN targeted command: same Jest command after implementation; exit `0`.
- GREEN result: `1` suite, `28` tests passed.
- Targeted coverage command collected `recurring-fixture.ts` and `recurring-wireframe.tsx`; exit `0`:
  - fixture: `97.05%` statements / `93.22%` branches
  - wireframe: `91.17%` statements / `92.30%` branches
  - combined: `94.70%` statements / `92.94%` branches

## Coverage and gates

| Gate | Exit | Evidence |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | lockfile current; pnpm 10.18.3 |
| `pnpm format:check` | 0 | all files formatted |
| `pnpm lint` | 0 | no errors/warnings after fixes |
| `pnpm typecheck` | 0 | all 7 typecheck projects passed |
| targeted U16 test + coverage | 0 | 28/28; coverage above |
| `pnpm test:unit` | 0 | mobile 27 suites / 309 tests; contracts 4 suites / 18 tests |
| `pnpm test:contract` | 0 | 4 suites / 18 tests |
| `pnpm test:coverage:u00` | 0 | 1 suite / 22 tests; 87.92% statements / 81.85% branches |
| `pnpm audit --audit-level high` | 0 | one pre-existing moderate advisory; no high/critical finding |
| `npx expo config --type public` | 0 | development public config resolved |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0 | Android bundle and metadata exported |
| `git diff --check` | 0 | clean whitespace check |

## Scope and security review

- Route uses the existing F13 manifest entry `/planning/recurring`, authenticated app group, and hidden Expo Router registration; Planning has a deterministic entry CTA.
- Fixture covers recurring rule lifecycle, cadence preview, month-end clamp/skip, amount modes, occurrence matching/unmatching/skip/snooze, pending/paid semantics, offline/conflict/read-only, materialization retry, and matching/push kill switches.
- Money formatting uses the existing UI money primitive and input validation keeps canonical integer minor-unit strings.
- No `fetch`, Supabase, SQL, persistence, native dependency, notification scheduler, file/share operation, or production payment behavior was added.
- URLs remain static; no payload, amount, payee, rule/entity identifier, credential, or token is placed in navigation, logging, analytics, or test output. Privacy mode masks rendered amounts and the UI uses accessible controls with 48dp minimum touch targets and a 320dp layout constraint.

## Deferred risks

Real recurrence materialization, transaction matching, timezone/DST scheduler behavior, reminders/push delivery, sync persistence, FX conversion, payment/auto-pay, and backend conflict enforcement remain outside Stage 1 and require later scoped work.
