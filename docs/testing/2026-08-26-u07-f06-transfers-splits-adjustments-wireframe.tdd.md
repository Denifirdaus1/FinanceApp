# U07 / F06 Transfers, Splits & Balance Adjustments — TDD Evidence

Tanggal: 2026-08-26
Scope: frontend-only deterministic fixture wireframe. Tidak ada tracker, backend, database, migration, Supabase, production network, persistence, atau U08.

## RED checkpoint

Kontrak ditulis lebih dahulu di `apps/mobile/src/screens/transfers/__tests__/transfers-wireframe.test.tsx`.

Command:

```text
pnpm --filter @financeapp/mobile test:unit -- transfers-wireframe.test.tsx --runInBand
```

Result: exit 1 karena modul `../transfers-wireframe` belum tersedia. Checkpoint commit: `64ca278` (`test: add U07 F06 transfers splits adjustment wireframe contracts`).

## GREEN

Fixture dan wireframe mencakup transfer same-currency dengan signed lines seimbang, fee terpisah, liability explanation, split amount/percentage dengan bigint largest remainder, adjustment delta/basis version, reversal, locked period, archived dependency, permission denied, offline sync, failed aggregate rollback, serta read-only history. Semua operasi memerlukan review dan mutation ID fixture deterministik.

Command:

```text
pnpm --filter @financeapp/mobile test:unit -- transfers-wireframe.test.tsx --runInBand
```

Result: exit 0, 18 tests passed.

Targeted coverage (fixture + wireframe): 94.73% statements, 85.71% branches. Per-file: `transfers-fixture.ts` 94.03% statements / 85.02% branches; `transfers-wireframe.tsx` 96.55% statements / 88.23% branches.

## Safety and accessibility checks

- `amountMinor` boundary memakai string + `bigint`; tidak ada floating point.
- Archived/inaccessible accounts dikeluarkan dari presentation picker; history tetap terlihat.
- Tidak ada fetch, persistence, Supabase import, logging, atau data operasi di URL.
- Route `/transfers` berada di app group yang sama dengan guard/provider existing dan disembunyikan dari bottom tabs.
- CTA transfer, split, adjustment, history, review, confirm, back, retry fixture memiliki hasil UI yang terlihat.
- Layout contract menetapkan 320dp minimum dan 48dp touch target; reduced motion path teruji.

U08/F17 dan cross-currency FX tidak dimulai.
