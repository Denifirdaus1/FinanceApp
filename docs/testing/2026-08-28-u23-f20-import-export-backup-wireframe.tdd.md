# U23 / F20 — Import, Export & Portable Backup Wireframe

Tanggal: 2026-08-28
Scope: frontend-only deterministic fixtures; tidak ada file I/O, persistence, network, native share, backend, Supabase, atau tracker write.

## TDD evidence

### RED

Command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/import-export/__tests__/import-export-u23-wireframe.test.tsx --forceExit
```

Exit: `1`
Failure: `Cannot find module '../import-export-wireframe'`
Checkpoint: `7933e69ff5c55937bccf37f1b0f2bb70d44c0b07`

### GREEN

Command:

```text
pnpm --dir apps/mobile exec jest --runInBand src/screens/import-export/__tests__/import-export-u23-wireframe.test.tsx --coverage --collectCoverageFrom=src/screens/import-export/import-export-fixture.ts --collectCoverageFrom=src/screens/import-export/import-export-wireframe.tsx --forceExit
```

Exit: `0`
Result: 1 suite, 16 tests passed.
Targeted coverage: `96.15% statements`, `85.33% branches`, `95.83% functions`, `97.84% lines`.

## Implemented behavior

- Profile route `/profile/import-export` remains authenticated and uses the existing F20 manifest entry.
- Export preview covers CSV/JSON, UTF-8, locale/timezone/currency metadata, schema version, checksum, raw/display separation, row buckets, attachment opt-in, re-auth/password/encryption/TTL/quota copy, safe share/download preview, and safe cancel/expiry.
- Import preview covers UTF-8/BOM, comma/semicolon/tab profiles, explicit mapping, id-ID/en-US string parsing, formula-as-text protection, invalid reasons, duplicate review, dry-run, bounded progress, resume with stable mutation key, partial reconciliation, undo preview, offline blocking, and kill-switch fallback.
- Privacy handoff and diagnostic preview expose only safe route/enum/bucket metadata. No real file is created or shared.
- Controls are deterministic, accessible, 320dp/48dp-aware, reduced-motion aware, and preserve safe back/cancel behavior.

## Full gates

| Gate | Exit | Evidence |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | pnpm 10.18.3, lockfile unchanged |
| `pnpm format:check` | 0 | all files formatted |
| `pnpm lint` | 0 | no lint findings |
| `pnpm typecheck` | 0 | all workspace projects pass |
| `pnpm test:unit` | 0 | 34 suites, 425 tests passed |
| `pnpm test:contract` | 0 | 4 suites, 18 tests passed |
| `pnpm test:coverage:u00` | 0 | 22 tests; 87.92% statements / 81.85% branches |
| `pnpm audit --audit-level high` | 0 | one pre-existing moderate advisory; no high/critical failure |
| `npx expo config --type public` | 0 | Expo SDK 56 config valid |
| `npx expo export --platform android --output-dir .expo-smoke-dist` | 0 | Android bundle and metadata generated; temporary output removed |
| `git diff --check` | 0 | clean |
| scoped secret scan | 0 | no credential pattern found |

## Scope and security review

No changes were made to database, migrations, RLS/RPC, Supabase, data/sync/domain packages, credentials, native dependencies, tracker, or U24. Fixture outputs redact payload content, file names, IDs, amounts, credentials, auth/OAuth/service keys, security logs, and unauthorized/deleted-user data. Import/export analytics or network calls are not implemented. Production parser, encrypted archive, server batch, real persistence, OS share/download, and account-deletion request integration remain deferred.

U24 was not started. Tracker/database were not touched.
