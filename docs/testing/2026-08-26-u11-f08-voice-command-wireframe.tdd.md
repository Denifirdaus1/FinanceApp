# U11 / F08 Voice Command Wireframe

## Scope

Stage 1 frontend-only interactive wireframe with typed deterministic fixtures. Voice recognition, parser, permission, and save outcomes are represented locally; there is no real microphone, audio file, network, persistence, Supabase, or production session.

## TDD evidence

### RED

Command:

```text
pnpm --filter @financeapp/mobile test:unit -- voice-command-wireframe.test.tsx --runInBand --forceExit
```

Result: exit code 1. Jest could not resolve `../voice-command-wireframe` because the F08 implementation did not yet exist.

Checkpoint: `8bc81e5 test: add U11 F08 voice command wireframe contracts`.

### GREEN

Targeted command:

```text
pnpm --filter @financeapp/mobile exec jest --runInBand src/screens/voice/__tests__/voice-command-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/voice/voice-fixture.ts --collectCoverageFrom=src/screens/voice/voice-command-wireframe.tsx --forceExit
```

Result: exit code 0; 1 suite and 11 tests passed.

Targeted coverage:

| Scope | Statements | Branches |
| --- | ---: | ---: |
| Voice fixture + wireframe | 87.94% | 86.66% |
| `voice-command-wireframe.tsx` | 77.90% | 68.75% |
| `voice-fixture.ts` | 94.20% | 92.51% |

The combined fixture + wireframe result exceeds the U11 threshold of 80% statements and branches; the wireframe-only report is shown transparently for follow-up edge-state expansion.

## Implemented behavior

- F08 route `/voice-capture`, hidden tab registration, and minimal F05/global-capture handoff.
- Review editor exposes direction, amount, account, category, occurred date/time, timezone, merchant, note, and tags as correction fields.
- True on-device `id-ID` capability check, just-in-time permission fixture, denied/unavailable Settings/manual fallback.
- Ready/listening/partial/processing/interruption/silence/error and manual-only states with deterministic accessible actions.
- Indonesian expense/income parsing fixture, integer minor-unit validation, entity ambiguity/collision/archive handling, explicit correction/review, alias fixture action, no auto-post.
- Explicit confirmation/cancel, offline/idempotent fixture result, transcript session TTL/purge copy, and no audio storage.

## Quality gates

Recorded from final local verification:

- `pnpm install --frozen-lockfile`: exit 0
- `pnpm format:check`: exit 0
- `pnpm lint`: exit 0
- `pnpm typecheck`: exit 0
- targeted U11 test + coverage: exit 0
- `pnpm test:unit`: exit 0; final local mobile Jest run 22 suites / 237 tests passed
- `pnpm test:contract`: exit 0; 4 suites / 18 tests passed
- `pnpm test:coverage:u00`: exit 0; 1 suite / 22 tests passed
- `pnpm audit --audit-level high`: exit 0; one existing moderate vulnerability reported
- `npx expo config --type public`: exit 0
- `npx expo export --platform android --output-dir .expo-smoke-dist`: exit 0
- `git diff --check`: exit 0
- staged-equivalent secret scan: clean

## Security and scope review

- No fetch, logging, cloud STT/LLM, Supabase transcript/session, audio path, raw audio file, persistence, or background wake word.
- Navigation does not receive transcript, amount, merchant, note, date, currency, or entity identifiers.
- Partial transcript is shown only as a local fixture review aid; structured fields remain editable and confirmation is mandatory.
- U12/F09 is not started and the tracker is not accessed or modified.

## Known risks / deferred work

Real microphone capability adapters, platform permission APIs, encrypted local session retention, production parser/entity resolution, and F05 persistence remain future work outside U11.
