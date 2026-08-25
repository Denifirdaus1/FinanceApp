# S05 TDD Evidence — Security, Local Database, and Observability

Date: 2026-08-25
Scope: Task S05 only

## Implemented boundaries

- Per-install 256-bit SQLCipher key generated with `Crypto.getRandomBytesAsync`, stored in SecureStore with a device-only accessibility class, and purged after the database on logout, account deletion, session revocation, key loss, or corruption.
- SQLCipher native config and runtime bootstrap: key is validated before `PRAGMA key`, database hardening pragmas run before access, integrity is checked, and one fail-closed corruption recovery is allowed.
- Pure repository/transaction contracts plus a versioned outbox envelope with UUID operation ID, idempotency key, entity version, tombstone, JSON-safe payload, and cloned purge directive.
- Analytics allowlist, exact property schemas, recursive redaction, forbidden financial/raw-capture fields, and a safe sink wrapper.
- App-lock/privacy-mode façade with locked-by-default and background-lock behavior.

## RED evidence

Checkpoint commit: `f12e90e test: define S05 security and local-first contracts`

| Command | Exit | Intended failure |
|---|---:|---|
| `pnpm --filter @financeapp/sync test:unit` | 1 | Missing DB and outbox production modules |
| Mobile S05 Jest selection | 1 | Missing security/analytics modules and native config plugins |
| Security hardening follow-up selection | 1 | Mutable purge directive, raw SecureStore error, snake-case sensitive field, and unrestricted diagnostic string |

The RED checkpoint was committed locally but was not pushed while it was the branch tip.

## GREEN evidence

| Gate | Result |
|---|---|
| `pnpm format:check` | pass |
| `pnpm lint` | pass, zero warnings after import-order fix |
| `pnpm typecheck` | pass across all workspace projects |
| `pnpm test:unit` | pass: 122 tests across config, domain, sync, contracts, and mobile |
| `pnpm test:contract` | pass: 11 tests |
| Sync S05 coverage | 95.89% statements, 97.14% branches, 100% functions, 95.83% lines |
| Mobile security/analytics coverage | 90.44% statements, 87.36% branches, 91.83% functions, 92.44% lines |
| `pnpm audit --audit-level high` | pass; one existing moderate advisory remains below the blocking policy |
| Expo public config | pass; SDK 56 and SQLCipher/SecureStore plugins present |
| Expo Android export smoke | pass; Hermes bundle exported |

## Fault-test mapping

- Key loss: unreadable local DB is closed/deleted before the old key entry is removed and replaced.
- Logout/account deletion: DB close/delete completes before SecureStore key deletion.
- Revoked/signed-out session: private local state is purged without opening the DB.
- Corrupted DB: native details are suppressed, local state is purged, one fresh DB/key retry occurs, then a generic error is returned on repeat failure.
- Offline boot: a valid cached signed-in session opens encrypted local state without a network dependency.
- Redaction: amount, balance, merchant, notes, account numbers, receipt image, OCR/transcript, audio/voice, tokens, and unknown free-form diagnostics cannot reach the analytics sink.

## Security review notes

- No hardcoded secret or service-role credential was added.
- The only dynamic SQL value is a 64-character lowercase hex key validated before interpolation.
- Outbox payloads reject cycles, non-finite numbers, class instances, unsafe object keys, unsafe identifiers, malformed versions/timestamps, and mismatched purge scopes.
- Key material cannot be reliably zeroed from JavaScript immutable strings; lifecycle minimizes retention and delegates at-rest protection to SecureStore and SQLCipher.
- A stale iOS Keychain value is rotated when the app database is absent, preserving per-install semantics after uninstall/reinstall behavior.

References: Expo SDK 56 SQLite/SQLCipher, SecureStore, Crypto, and FileSystem official documentation.

## Deferred native acceptance

No EAS build or Maestro cloud job was triggered. Because SQLCipher changes native configuration and is unsupported in Expo Go, one new development build must be installed later for Android/iOS device smoke. This remains a separate deferred acceptance item, not a reason to spend build quota during S05 implementation.

Local `pnpm supabase:test` could not run because Supabase CLI is intentionally not installed on this workstation. The pinned Supabase CLI job in GitHub Actions is the authoritative migration/pgTAP regression gate.
