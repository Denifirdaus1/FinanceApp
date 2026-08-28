# U24 / F21 — AI Insights & Financial Assistant Wireframe

Tanggal: 2026-08-28
Scope: frontend-only deterministic fixture preview; discovery-gated, tanpa model/provider, network, persistence, database, tracker write, atau U25.

## TDD evidence

### RED

Command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/ai-insights/__tests__/ai-insights-u24-wireframe.test.tsx --forceExit
```

Exit: `1`
Failure: `Cannot find module '../ai-insights-wireframe'`
RED checkpoint: `d0af39ba1d5893c56e9254d327d9a3a4c76ea720`

### GREEN

Command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/ai-insights/__tests__/ai-insights-u24-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/ai-insights/ai-insights-fixture.ts --collectCoverageFrom=src/screens/ai-insights/ai-insights-wireframe.tsx --forceExit
```

Exit: `0`
Result: 1 suite, 19 tests passed.
Targeted coverage: `95.23% statements`, `85.52% branches`, `97.67% functions`, `95.95% lines`.

## Implemented behavior

- Authenticated `/reports/insights` route with safe Reports handoff and existing guard/provider/layout.
- AI consent off-by-default with disclosure of processed aggregated facts, purpose, retention, provider class, non-AI alternative, revoke, and deletion fixture.
- Weekly/monthly insights show deterministic income, expense, savings, budget variance, recurring change, and anomaly facts before an AI-generated explanation; period, why-this, source, uncertainty, missing-data, privacy masking, and offline snapshot are explicit.
- Assistant confirms current household and time range, exposes only five read-only allowlisted tools, returns typed sourced facts, grounds numeric claims to a deterministic aggregate, and refuses unsupported advice/autonomous actions.
- Prompt injection is untrusted data; timeout, outage, 429, quota, unsafe output, access error, revoke, and kill-switch states use deterministic Reports fallback. Feedback, clear conversation, local-only/30-day retention, and budget/category/rule draft handoffs remain confirmation-gated.
- UI uses U00 primitives, accessible labels, safe back behavior, reduced motion copy, 320dp/48dp hints, and no sensitive values in routes/logs/analytics fixture.

## Full gates

| Gate | Exit | Result |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | lockfile unchanged |
| `pnpm format:check` | 0 | all files formatted |
| `pnpm lint` | 0 | no lint findings |
| `pnpm typecheck` | 0 | all workspace projects pass |
| `pnpm test:unit` | 0 | 35 suites, 444 tests passed |
| `pnpm test:contract` | 0 | 4 suites, 18 tests passed |
| `pnpm test:coverage:u00` | 0 | 22 tests; 87.92% statements / 81.85% branches |
| `pnpm audit --audit-level high` | 0 | one pre-existing moderate advisory; no high/critical failure |
| `npx expo config --type public` | 0 | Expo SDK 56 config valid |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0 | Android bundle + metadata generated; temporary output removed |
| `git diff --check` | 0 | clean |
| scoped secret scan | 0 | no credential pattern found |

## Scope and security review

No Supabase, SQL/RLS/RPC, migration, tracker, backend, provider SDK, native dependency, fetch, persistence, analytics payload, credential, raw receipt/audio/note/email/identifier, or financial data was added. Production consent ledger, JWT/membership checks, model gateway, eval harness, server-side retention, and real deletion remain deferred behind discovery/security/privacy/cost gates.

U25 was not started. Tracker and database were not touched.
