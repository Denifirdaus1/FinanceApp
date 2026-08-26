# U05 / F04 — Categories, Tags & Classification Rules Wireframe

Tanggal: 2026-08-26  
Scope: frontend-only typed fixtures; tidak ada Supabase, network, persistence, migration, atau backend rule engine.

## RED

Test contract dibuat lebih dulu di:

- `apps/mobile/src/screens/categories/__tests__/categories-wireframe.test.tsx`

Command:

```text
pnpm --filter @financeapp/mobile test:unit -- categories-wireframe.test.tsx
```

Hasil RED: gagal karena modul implementasi `../categories-fixture` belum tersedia. Checkpoint: `e2192b8` (`test: add U05 categories tags rules contracts`).

## GREEN evidence

Targeted contract mencakup:

- category/tag normalization, duplicate handling, hierarchy/cycle and length validation;
- allowlisted operators, 1–8 AND conditions, action requirement, merchant bounds, and integer minor-unit money;
- deterministic priority/specificity/created-at evaluation, category winner, unique tag union, and 20-item preview cap;
- archive/restore, online-required merge, conflict review, newer-schema read-only;
- ready/offline/empty/syncing/error states, retry, navigation, back action, accessibility, reduced motion, 320dp, no network, and no dead action.

Targeted GREEN command and result:

```text
pnpm --filter @financeapp/mobile test:unit -- categories-wireframe.test.tsx
10 tests passed, 1 suite passed
```

Expanded GREEN result after edge-state coverage:

```text
12 tests passed, 1 suite passed
Statements: 90.09% · Branches: 86.20% · Functions: 91.48% · Lines: 91.42%
```

Mobile typecheck:

```text
pnpm --filter @financeapp/mobile typecheck
exit code 0
```

## Implementation boundary

- Fixture state is in `apps/mobile/src/screens/categories/categories-fixture.ts`.
- UI is in `apps/mobile/src/screens/categories/categories-wireframe.tsx`.
- Expo Router entry is `apps/mobile/app/(app)/categories.tsx`; it is hidden from the five bottom tabs and linked from Profile.
- Existing U01 manifest entry for F04 remains `WIREFRAME READY`; no F05 route or transaction implementation was started.
- All actions produce a visible fixture result; no names, category/tag values, or financial values are placed in URLs or logs.

## Remaining gates

## Final local gates

```text
pnpm install --frozen-lockfile       exit 0
pnpm format:check                    exit 0
pnpm lint                            exit 0
pnpm typecheck                       exit 0
pnpm test:unit                       exit 0 — 16 suites / 149 tests
pnpm test:contract                   exit 0 — 4 suites / 18 tests
pnpm test:coverage:u00               exit 0 — 87.92% statements / 81.85% branches
pnpm audit --audit-level high        exit 0 — one moderate advisory, no high+ finding
npx expo config --type public        exit 0
Expo Android smoke export            exit 0 from apps/mobile, 1,249 modules bundled
git diff --check                     exit 0
staged-equivalent secret scan        clean
```

The repository-root Expo export command is not applicable because the root config has no Metro platform; the CI-equivalent command was run from `apps/mobile`, its configured working directory, with the same smoke output directory and placeholder development environment.
