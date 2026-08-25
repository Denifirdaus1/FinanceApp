# U00 TDD Evidence — Warm Pastel Design System

## Source plan

- `docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md` — Task U00.
- `docs/02-ux-ui-design-system.md` — warm minimal visual, accessibility, privacy, responsive, and motion rules.

## User journeys

1. A user can read and operate every primitive at 320 dp, with text scaling left unrestricted up to and beyond 200%.
2. A screen reader receives explicit roles, labels, states, live feedback, and redacted sensitive values.
3. A user who enables Reduce Motion receives non-animated feedback and modal transitions.
4. A user can enter localized integer or fractional money without floating-point conversion or silent ambiguous parsing.
5. Light and dark themes preserve the same semantic API and readable contrast.

## RED → GREEN execution

| Behavior | RED evidence | GREEN evidence |
|---|---|---|
| Public token and primitive API | Commit `c1fc958` added U00 contracts before implementation. | Commits `9214118` and `a57b537` implemented and aligned the semantic API. |
| Money input safety | `pnpm test:unit -- u00` exited 1: repeated minus parsed as `-100n`; focused locale switch kept `1.25`. | Same command passes 22/22; repeated signs/separators return `null`, Arabic digits round-trip, fractional drafts and external resets remain editable. |
| Font runtime boundary | U00 test expected `PlusJakartaSans_400Regular` but received an unloaded family; contract lacked the three font dependencies and root loader. | Four static weights load through `useFonts`; the root splash gate waits for load or safe fallback, and Android export includes the assets. |
| Coverage gate | Initial package coverage was 74.14% branches and failed the 80% threshold. | `pnpm test:coverage:u00` passes the enforced 80% global threshold. |

## Test specification

| Guarantee | Command / test | Type | Result |
|---|---|---|---|
| All 16 required primitives are exported and represented by the internal catalog | `pnpm test:contract`; catalog mount test | Contract/component | PASS |
| Light/dark text and status pairs meet WCAG 4.5:1 | `ui-contract.test.ts` contrast calculation | Contract | PASS |
| Raw hex colors remain confined to token definitions | `ui-contract.test.ts` source boundary | Contract | PASS |
| Touch targets are at least 48 dp and focus states are visible | U00 component contracts | Component | PASS |
| 320 dp catalog, wrapping dialog actions, scrollable long copy, and unrestricted text scaling remain supported | U00 component contracts and source contract | Component/contract | PASS |
| Reduced Motion disables skeleton, sheet, dialog, and loading-spinner animation paths | U00 component contracts | Component | PASS |
| Sensitive values and chart alternatives do not leak hidden amounts | U00 component contracts | Privacy component | PASS |
| Localized money rejects ambiguous syntax and never converts through floating point | U00 component contracts | Unit/component | PASS |
| Full workspace remains regression-free | `pnpm test:unit` | Unit/component/property | PASS — 153 tests |
| Public contracts remain stable | `pnpm test:contract` | Contract | PASS — 18 tests |
| Expo can bundle Android with the registered fonts | `pnpm exec expo export --platform android --output-dir .expo/export-u00` | Build smoke | PASS — 1249 modules |

## Coverage

`pnpm test:coverage:u00`:

- Statements: 87.92%
- Branches: 81.85%
- Functions: 83.69%
- Lines: 87.86%
- Enforced minimum: 80% for every metric

## Final quality evidence

- `pnpm install --frozen-lockfile` — PASS
- `pnpm format:check` — PASS
- `pnpm lint` — PASS, zero warnings
- `pnpm typecheck` — PASS across 7 projects
- `pnpm test:unit` — PASS
- `pnpm test:contract` — PASS
- `pnpm audit --audit-level high` — PASS; one existing moderate advisory remains below policy threshold
- `expo config --type public` — PASS, SDK 56 and development boundary intact
- `git diff --check` — PASS
- Credential pattern review — only existing security regex/test fixtures matched; no credential value was added

## Known gaps and deferred checks

- No paid EAS Build or Maestro cloud job was started. Android/iOS device smoke remains explicitly deferred by the owner from S04.
- The 320 dp catalog and 200% text-scale rules are enforced structurally and by component tests; pixel-level device screenshots remain part of later visual QA.
- Supabase migrations and pgTAP are unchanged by U00 and will be revalidated by the existing CI job after push.

## Merge evidence

- Checkpoint commits: `ad453e2`, `c1fc958`, `9214118`, `a57b537`.
- Final hardening is committed only after all gates above pass, then pushed normally to `main` without force.
- U01 is not started by this task.
