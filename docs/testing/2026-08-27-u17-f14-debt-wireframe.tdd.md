# U17 / F14 Debt & Loans Wireframe

Date: 2026-08-27
Scope: frontend-only deterministic fixtures. No backend, database, network, persistence, native dependency, real payment, or notification scheduler.

## TDD evidence

- RED command: `pnpm --dir apps/mobile exec jest --runInBand src/screens/debts/__tests__/debt-wireframe.test.tsx --forceExit`
- RED result: exit `1`; expected failure `Cannot find module '../debt-wireframe'`.
- RED checkpoint: `b4ffc2c` (`test: add U17 F14 debt wireframe contracts`).
- GREEN targeted command: same Jest command after implementation; exit `0`.
- GREEN result: `1` suite, `24` tests passed.
- Targeted coverage command collected `debt-fixture.ts` and `debt-wireframe.tsx`; exit `0`:
  - fixture: `97.93%` statements / `89.47%` branches
  - wireframe: `98.21%` statements / `80.00%` branches
  - combined: `98.03%` statements / `86.70%` branches

## Full gates

| Gate | Exit | Result |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | lockfile current |
| `pnpm format:check` | 0 | all files formatted |
| `pnpm lint` | 0 | no errors or warnings |
| `pnpm typecheck` | 0 | all workspace projects passed |
| targeted U17 test + coverage | 0 | 24/24 tests; coverage above |
| `pnpm test:unit` | 0 | mobile 28 suites / 333 tests; contracts 4 suites / 18 tests |
| `pnpm test:contract` | 0 | 4 suites / 18 tests |
| `pnpm test:coverage:u00` | 0 | 1 suite / 22 tests; 87.92% statements / 81.85% branches |
| `pnpm audit --audit-level high` | 0 | one pre-existing moderate advisory; no high/critical finding |
| `npx expo config --type public` | 0 | development public config resolved |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0 | Android bundle and metadata exported |
| `git diff --check` | 0 | clean whitespace check |
| staged-equivalent secret scan | 0 | no credential/token/private-key pattern |

## Scope and security review

- F14 manifest contract `/planning/debts` was reused; Planning gained one deterministic entry and Expo Router gained one hidden authenticated route.
- Fixture covers ledger and statement-assisted summaries, debt types/statuses, wizard validation, atomic principal/interest/fee payment review, statement difference/explicit adjustment, fixed-rate and zero-APR schedule, negative amortization, extra-principal scenario, archive/history, reminders, offline/conflict/permission recovery, partial FX, and kill switches.
- Actual outstanding is separated from pending and forecast. Principal is not expense; interest/fee are separate expense fixtures. Statement adjustment never changes opening balance silently.
- Existing U00–U16 guards/providers/navigation remain intact. No `fetch`, Supabase, SQL, persistence, file/share, notification API, analytics, or production payment behavior was added.
- URLs remain static. Amounts, balances, APR, payment details, debt/account/transaction/statement identifiers, credentials, and tokens are not placed in navigation, logs, analytics, or test snapshots. Privacy mode masks rendered amounts; controls use accessible labels and 48dp minimum targets with a 320dp layout constraint.

## Deferred risks

Real debt ledger/payment mutation, statement RPC, FX conversion, lender schedule parity, sync persistence, reminder delivery, access enforcement, and database/RLS security remain future scoped work. U18/F15 is not started.
