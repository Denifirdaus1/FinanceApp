# U22 / F19 Notifications, Widgets & Shortcuts Wireframe

Tanggal: 2026-08-28
Scope: frontend-only deterministic fixtures. Tracker, database, Supabase, network, native notification/widget/shortcut APIs, dan persistence tidak disentuh.

## TDD RED/GREEN

- RED command: `cmd.exe /d /c "pnpm --dir apps/mobile exec jest --runInBand src/screens/notifications/__tests__/notifications-u22-wireframe.test.tsx --forceExit"`
- RED exit: `1`
- RED failure: `Cannot find module '../notifications-wireframe'` dari kontrak U22.
- RED commit: `1f89a098fe7262009a2c6d517ec76f810230ecd6`.
- GREEN command: same targeted Jest command.
- GREEN exit: `0`; 1 suite / 16 tests passed.
- Targeted coverage command mengumpulkan `notifications-fixture.ts` dan `notifications-wireframe.tsx`.
- Targeted coverage: 100% statements, 93.42% branches, 100% functions, 100% lines.

## Implemented behavior

- Authenticated Profile entry menuju `/notifications` dengan manifest F19 `WIREFRAME READY` dan hidden Expo Router registration.
- Permission education just-in-time, granted/denied/blocked, in-app fallback, and no native permission request.
- Seven channel fixtures: recurring bill, debt due, budget threshold, goal milestone, sync issue, security, and weekly summary.
- Generic lock-screen copy by default; amount preview requires explicit opt-in and unlock guard. Security channel remains enabled in the fixture.
- Quiet hours Asia/Jakarta, DST-safe copy, snooze, threshold hysteresis, cross-device dedupe, safe delivery metadata, invalid-token/logout/revoke cancellation.
- Offline cached reminder, stale/error retry, safe fallback for tampered/stale links, kill-switch in-app fallback.
- Widget preview hides amount/account by default; shortcut previews for expense/income/voice/receipt always end at confirmation and never auto-post.
- All visible actions have deterministic results, accessible labels, 48dp touch-target primitives, reduced-motion copy, and 320dp layout hint.

## Gates

| Gate | Exit/result |
|---|---:|
| `pnpm install --frozen-lockfile` | 0 |
| `pnpm format:check` | 0 |
| `pnpm lint` | 0 |
| `pnpm typecheck` | 0 |
| targeted U22 + coverage | 0; 16 tests; 100% / 93.42% |
| `pnpm test:unit` | 0; 33 suites / 409 tests |
| `pnpm test:contract` | 0; 4 suites / 18 tests |
| `pnpm test:coverage:u00` | 0; 22 tests; 87.92% / 81.85% |
| `pnpm audit --audit-level high` | 0; one pre-existing moderate advisory |
| `npx expo config --type public` | 0; Expo SDK 56 config valid |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0; Android bundle/assets/metadata verified |
| `git diff --check` | 0 |
| scoped secret scan | 0; no credential-like match |

## Scope/security review

U22 changes are limited to notification screen/fixture/tests, Profile navigation entry, Expo Router registration, and evidence. No fetch, logging, analytics payload, token value, notification payload, account/household identifier, amount, or sensitive URL parameter is created. Widget/shortcut/permission actions are explicitly previews and fixture outcomes only.

## Deferred production risks

Real OS permission flow, local/push scheduling, encrypted token storage, server dedupe, quiet-hours scheduler, delivery provider, widget/shortcut registration, revoke cancellation, and deep-link authorization remain deferred to production/native/backend work.

U23 was not started and tracker/database were not modified.
