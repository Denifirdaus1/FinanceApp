# U04 / F03 Accounts, Assets & Liabilities Wireframe — TDD Evidence

Tanggal: 2026-08-26
Workspace: `C:\Project\FinanceApp`
Scope: fixture-only frontend; tidak ada database, Supabase, network, persistence, migration, F04, F06, atau F14 lifecycle.

## RED

Test contract ditulis lebih dahulu di:

`apps/mobile/src/screens/accounts/__tests__/accounts-wireframe.test.tsx`

Command:

```text
pnpm --filter @financeapp/mobile exec jest --runInBand src/screens/accounts/__tests__/accounts-wireframe.test.tsx
```

Hasil RED: exit code `1`, dengan error module `../accounts-fixture` belum tersedia.
Commit RED: `0130fff` — `test: add U04 F03 accounts wireframe contracts`.

## GREEN

Implementasi mencakup typed account fixture, integer minor-unit parsing melalui `@financeapp/domain`, list/detail/create/edit/archive, valuation history, liability shell, multi-currency subtotal, deterministic retry/conflict states, route `/accounts`, dan Profile entry point.

Command targeted:

```text
pnpm exec jest --runInBand src/screens/accounts/__tests__/accounts-wireframe.test.tsx
```

Hasil: `18 passed`, exit code `0`.
Commit GREEN: `1b148ee` — `fix: implement U04 F03 accounts assets liabilities wireframe`.

Coverage command:

```text
pnpm exec jest --runInBand src/screens/accounts/__tests__/accounts-wireframe.test.tsx --coverage --collectCoverageFrom="src/screens/accounts/**/*.{ts,tsx}"
```

Hasil U04:

| Metric | Result |
| --- | ---: |
| Statements | 91.35% |
| Branches | 80.69% |
| Functions | 85.00% |
| Lines | 92.54% |

## Contract coverage

- Delapan account type: cash, bank, e-wallet, credit card, investment, loan, receivable, other.
- Currency hanya `IDR`, `USD`, `JPY`; opening balance memakai BigInt/int minor units dan tidak menggunakan floating point.
- Currency account ber-activity terkunci; edit mengarahkan pembuatan account baru.
- Archive memakai konfirmasi eksplisit, dependency-blocked fixture, cancel, restore, dan presentasi archived.
- Asset valuation memakai history efektif terakhir dan tidak dihitung dua kali bersama ledger source.
- Liability hanya debt shell: outstanding principal, tracking mode, due date, dan scheduled payment; lifecycle F14 tidak dimulai.
- Missing FX menampilkan subtotal per currency dan incomplete total.
- State loading, ready, empty, offline, syncing, partial currency, error, local-only, sync-pending, synced, conflict, dan archived deterministic.
- Route test memverifikasi guard/provider bootstrap tetap melalui Expo Router dan Profile → `/accounts`.
- Test memastikan fixture tidak memanggil `fetch` atau persistence; tidak ada nominal/identifier sensitif pada URL.
- Accessibility test memverifikasi role/label, focusable actions, reduced motion indicator, minimum 320dp, dan touch target U00 ≥48dp.

## Pending full gates

Full repository quality gates, Expo Android export, secret scan, push, dan CI dijalankan setelah commit GREEN ini dan dicatat pada delivery report.
