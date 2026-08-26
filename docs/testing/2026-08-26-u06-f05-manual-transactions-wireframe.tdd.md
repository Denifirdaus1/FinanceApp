# U06 / F05 Manual Transactions Wireframe — TDD Evidence

Tanggal: 2026-08-26
Scope: frontend-only deterministic fixture wireframe; tidak ada perubahan tracker, backend, database, migration, Supabase, network, atau persistence.

## RED checkpoint

Test contract ditulis lebih dahulu di:

`apps/mobile/src/screens/transactions/__tests__/transactions-wireframe.test.tsx`

RED diverifikasi sebelum implementasi:

```text
Cannot find module '../transactions-fixture'
Test Suites: 0 executed
```

Checkpoint RED: `90f39f4` — `test: add U06 F05 manual transaction wireframe contracts`.

## GREEN evidence

Targeted command:

```text
pnpm --filter @financeapp/mobile test:unit -- transactions-wireframe.test.tsx
```

Hasil terakhir:

```text
exit 0
Test Suites: 1 passed, 1 total
Tests: 18 passed, 18 total
```

Targeted coverage untuk fixture dan wireframe U06:

| File | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `transactions-fixture.ts` | 95.41% | 91.42% | 95.83% | 95.74% |
| `transactions-wireframe.tsx` | 92.50% | 85.62% | 95.16% | 94.50% |

Contract yang tercakup meliputi integer minor-unit boundary, signed account/category lines, draft no-balance invariant, suggestion apply/reject/override, duplicate warning dan konfirmasi kedua, offline pending/retry idempotent, sync failure/session expired, expected-version conflict, duplicate-as-draft, void tombstone/restore/retention, archived dependency picker/history, accessibility/reduced motion/320dp, route guard regression, dan no production network/sensitive route state.

## Full quality gates

Semua command berikut selesai dengan exit code `0` pada workspace:

```text
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:contract
pnpm test:coverage:u00
pnpm audit --audit-level high
npx expo config --type public
npx expo export --platform android --output-dir .expo-smoke-dist
git diff --check
staged-equivalent secret scan
```

Ringkasan:

- Unit: 17 suites, 166 tests passed.
- Contract: 4 suites, 18 tests passed.
- U00 coverage: 22 tests passed; 87.92% statements dan 81.85% branches.
- Expo Android export: berhasil dengan development placeholder env; tidak ada paid build.
- Audit: exit `0`; satu advisory moderate transitive `uuid`, high/critical `0`, di luar scope U06.
- Secret scan: tidak menemukan secret pada added diff.

## Scope and privacy review

- Route `/transactions` tetap terhubung ke manifest F05; `/capture` membuka quick-add fixture dan memakai router back.
- Semua action utama menghasilkan state/result yang terlihat; tidak ada tombol U06 yang menjadi dead action.
- Fixture tidak memanggil `fetch`, Supabase Auth, production network, persistence, database, atau outbox.
- Nominal tetap string minor unit dan dikonversi ke `bigint` hanya di boundary domain fixture.
- ID transaksi, nominal, merchant, note, tanggal, akun, kategori, dan tag tidak dimasukkan ke URL, analytics, crash breadcrumb, atau console log.
- U07/F06 tidak dimulai.
