# F14 — Debt & Loans

## Metadata

- **Status:** Siap implementasi
- **Fase:** Phase 3
- **Prioritas:** P1
- **Platform:** Expo React Native iOS/Android
- **Dependensi wajib:** `accounts`, `financial_entries`, `entry_splits`, recurring/calendar, kurs snapshot, Supabase RLS, SQLCipher

## Outcome dan JTBD

**Outcome:** pengguna dapat mencatat saldo kewajiban, pembayaran principal/interest/fee, jatuh tempo, dan proyeksi amortisasi secara transparan tanpa double-counting cashflow.

**JTBD:** “Ketika memiliki pinjaman atau kartu kredit, saya ingin mengetahui saldo tercatat, pembayaran berikutnya, komposisi pembayaran, dan perkiraan jadwal lunas berdasarkan input saya sendiri.”

Semua proyeksi adalah kalkulasi matematis dari data pengguna, bukan nasihat kredit, restrukturisasi, investasi, pajak, atau rekomendasi pemberi pinjaman.

## Scope

- Jenis: installment loan, mortgage/manual secured loan, credit card/revolving, dan debt manual.
- Tracking mode ledger atau statement-assisted.
- Saldo outstanding, limit opsional, statement/due date, minimum due input user.
- Payment yang dipisah menjadi principal, interest, fee, dan adjustment.
- Jadwal fixed-rate amortizing informasional; extra principal scenario lokal.
- Riwayat balance/payment, upcoming due, payoff progress, dan drill-down.
- Reminder privasi-safe dan recurring template untuk pembayaran.
- Rekonsiliasi terhadap statement manual.
- Multi-currency per debt dengan base conversion snapshot.
- Offline input/forecast dan sync idempotent.

## Non-scope

- Pengajuan pinjaman, pembayaran nyata, lender integration/open banking, credit score, refinancing recommendation.
- Variable/index-linked interest, compounding harian kompleks, teaser rate, denda legal, pajak, escrow, atau kontrak lender khusus tidak termasuk rilis awal fitur ini.
- Debt snowball/avalanche recommendation otomatis. User boleh membuat scenario urutan manual tanpa klaim optimal.
- Jaminan akurasi statement; angka resmi tetap berasal dari lender.
- Penagihan, komunikasi kreditor, atau saran hukum.

## Kontrak dan tanda angka

- `outstanding_minor bigint` disimpan/tampil positif dan memakai `debts.currency_code`; seluruh uang persisten adalah minor unit bigint + currency. `numeric` hanya untuk FX/rate/percentage, bukan uang.
- Source of truth tetap satu ledger: header `financial_entries` dan `entry_splits`. Saldo debt/account berasal dari `line_type='account'` dengan `amount_minor` negatif/positif; reporting memakai `line_type='category'` dengan `amount_minor > 0`. `line_role` hanya semantic role.
- Header memakai `entry_type=income|expense|transfer|balance_adjustment|refund|reversal`, `lifecycle_status=draft|posted|void`, dan `clearing_status=pending|cleared|reconciled`; klasifikasi/status gabungan dan delta saldo tidak disimpan di header.
- Principal payment adalah entry `transfer` dari asset account ke liability account dengan dua signed account line dan selalu dikecualikan dari consolidated cashflow.
- Interest, fee opsional, dan other expense masing-masing merupakan entry `expense` terpisah yang ditautkan oleh `payment_group_id`; category line positif menentukan budget/report. Komponen tidak boleh disisipkan sebagai fee split pada header transfer.
- Actual hanya memakai entry `posted` dengan clearing `cleared|reconciled`; `clearing_status=pending` hanya projected, sedangkan `draft|void` dikecualikan.
- Semua row finance memakai `household_id`, `created_by`, `updated_by`, version, timestamps, tombstone, dan RLS membership + `private.can_access_account(p_household_id,p_account_id,p_action)` (`read|write|manage`) untuk setiap account/entry tertaut.

## UX flow

1. User membuat debt, memilih jenis/tracking mode, currency, opening outstanding/as-of, lalu term opsional.
2. Untuk fixed-rate, preview menampilkan input, formula, estimasi payment/schedule, total interest forecast, dan disclaimer bahwa lender statement adalah acuan.
3. Detail menampilkan actual outstanding, pending principal, next due/minimum due yang dimasukkan, dan schedule forecast.
4. “Catat pembayaran” meminta source account, total cash paid, principal, interest, fee; validation memastikan jumlah sama.
5. Saving membuat transaction/transfer dan debt allocation atomik. User dapat menautkan transaction existing agar tidak ganda.
6. Input statement membuat balance observation; selisih dengan ledger dijelaskan dan dapat direkonsiliasi sebagai explicit adjustment.
7. Extra-payment scenario berjalan lokal, tidak menulis transaksi dan jelas berlabel skenario.
8. Offline input masuk outbox; rejected conflict tetap menjadi draft review dan tidak mengubah saldo server.

## Functional requirements

- **F14-FR-001:** Debt valid membutuhkan type, currency, opening outstanding ≥0, dan as-of date.
- **F14-FR-002:** Actual outstanding berasal dari signed account line ledger actual (`posted` + `cleared|reconciled`) atau statement-assisted formula, bukan forecast schedule/projection table.
- **F14-FR-003:** Payment group wajib merekonsiliasi principal transfer + entry interest + entry fee opsional + entry other expense dalam currency payment setelah conversion rule.
- **F14-FR-004:** Principal tidak masuk expense/cashflow; interest/fee/other expense masuk dari entry expense/category line terpisah.
- **F14-FR-005:** Alokasi dari entry `clearing_status=pending` tampil terpisah dan tidak menurunkan actual.
- **F14-FR-006:** Fixed-rate schedule mengikuti formula dan rounding exact di bawah, dengan last payment disesuaikan.
- **F14-FR-007:** Schedule forecast tidak membuat actual transaction atau balance entry.
- **F14-FR-008:** Statement reconciliation tidak silently mengubah opening balance; user memilih adjustment eksplisit.
- **F14-FR-009:** Satu payment group tidak dapat dialokasikan melebihi cash outflow atau menautkan entry/account yang tidak dapat diakses user pemanggil.
- **F14-FR-010:** Refund/reversal terhadap payment memulihkan komponen sesuai allocation original.
- **F14-FR-011:** Missing FX membuat base net-worth/report partial, bukan outstanding native nol.
- **F14-FR-012:** Archive mempertahankan history dan tetap masuk net worth bila outstanding ≠0, kecuali `include_in_net_worth=false` eksplisit.
- **F14-FR-013:** Reminder due dedupe dan generik pada lock screen.
- **F14-FR-014:** Semua angka proyeksi menampilkan input/as-of/formula version.

## Aturan outstanding actual

### Ledger mode

- `outstanding(t) = opening_outstanding_minor + Σ actual debt effects` sampai `t`; setiap effect dibaca dari `entry_splits.amount_minor` pada `line_type='account'` liability dari header `posted` dengan clearing `cleared|reconciled`, lalu dipetakan oleh projection kind.
- Result tidak di-clamp; jika negatif, tampilkan `credit_balance` dan minta review, bukan menyembunyikannya.
- Interest/fee cash expense tidak menaikkan outstanding kecuali user/lender mencatatnya sebagai `capitalized_*`.

### Statement-assisted mode

- Ambil statement verified terbaru dengan `statement_date <= t`.
- `outstanding(t) = statement_closing_balance_minor + eligible actual account-line amount_minor effects` setelah statement cutoff hingga `t`, memakai `financial_entries.occurred_at` untuk cutoff dan `business_date` untuk grouping.
- Entry yang sudah termasuk dalam statement ditandai `included_through` agar tidak double-count.
- Tanpa statement, fallback ke opening formula dan status `unreconciled`.
- `reconciliation_difference = statement_closing_balance - calculated_balance_at_cutoff`.
- Adjustment hanya dibuat setelah konfirmasi sebagai header `entry_type=balance_adjustment` + signed liability account line; amount persis difference, menyimpan statement ID, dan tidak masuk cashflow.

## Aturan payment dan cashflow

- `cash_paid_minor = principal_amount_minor + interest_amount_minor + fee_amount_minor + other_expense_amount_minor`, semua bigint ≥0 dan memakai payment `currency_code`.
- Principal membuat entry transfer dengan signed account line keluar asset dan pengurang liability/debt; consolidated cashflow mengabaikannya.
- Interest, fee opsional, dan other expense dibuat sebagai entry expense terpisah dengan category line positif, lalu masuk budget/report ketika `posted` dan `clearing_status in (cleared,reconciled)`.
- Jika payment currency berbeda, setiap component menyimpan debt-currency amount + FX snapshot; jumlah source-currency component harus merekonsiliasi cash outflow setelah rounding residual ditempatkan pada principal dan dicatat.
- Pending: seluruh header komponen memakai `clearing_status=pending`; actual outstanding/cashflow tidak berubah dan projected outstanding hanya mengurangi pending principal.
- Pembatalan draft memakai `lifecycle_status=void`; koreksi entry posted memakai `entry_type=reversal` dengan `reversal_of_entry_id` dan account/category `amount_minor` lawan, tanpa menghapus history.

## Aturan amortisasi fixed-rate

- Input: current principal `P`, annual nominal rate `apr_bps / 10,000`, `payments_per_year` (12, 26, atau 52), remaining count `n`, first due date, dan optional scheduled payment.
- Periodic rate `r = annual_rate / payments_per_year`, dihitung decimal precision ≥28.
- Jika scheduled payment tidak diberikan dan `r > 0`: `payment = P × r / (1 - (1+r)^(-n))`.
- Jika `r = 0`: `payment = P / n`.
- Display payment dibulatkan half-away-from-zero ke minor unit. Untuk setiap period:
  - `interest = round(opening_principal × r)`;
  - `principal_component = min(opening_principal, max(payment - interest - configured_periodic_fee, 0))`;
  - `closing_principal = opening_principal - principal_component`;
  - final payment disesuaikan menjadi remaining principal + interest + fee.
- Bila payment ≤ interest + fee, tandai `negative_amortization`; schedule boleh menunjukkan saldo tidak lunas dan tidak mengklaim payoff date.
- Extra principal scenario diterapkan setelah scheduled principal pada date terpilih, dibatasi outstanding; schedule setelahnya direcompute. Scenario tidak memodifikasi actual ledger.
- Schedule aktual selalu tunduk pada lender rounding/terms; statement dapat berbeda.

## Credit card/revolving

- Balance aktual mengikuti ledger/statement, bukan formula fixed amortization.
- Credit limit dan minimum due adalah input user/statement; `utilization = outstanding / limit ×100` hanya jika limit >0, tanpa penilaian baik/buruk.
- APR disimpan untuk informational estimate. Implementasi awal tidak mengakru daily interest; UI tidak menampilkan forecast interest kecuali user memasukkan `estimated_interest_minor` per cycle.
- New purchases/draws meningkatkan outstanding dan dapat sekaligus menjadi expense transaction; linkage mencegah expense dicatat dua kali.

## Entitas dan fields

### `debts`

- `id uuid pk`, `household_id uuid`, `created_by`, `updated_by`, `name text`, `kind installment|mortgage|credit_card|manual`
- `tracking_mode ledger|statement_assisted`, `currency_code char(3)`
- `opening_outstanding_minor bigint >=0`, `opening_as_of date`, `credit_limit_minor bigint null`
- `include_in_net_worth boolean default true`, `status active|paid_off|archived`
- `account_id uuid null`, `timezone text`, audit/version/tombstone fields; linked account wajib lolos helper exact dengan `p_action='read'` atau `'write'` sesuai aksi

### `loan_terms`

- `debt_id uuid pk`, `household_id`, `created_by`, `updated_by`, `apr_bps integer >=0`, `payments_per_year 12|26|52`
- `original_term_count integer`, `remaining_term_count integer`, `first_due_local_date date`
- `scheduled_payment_minor bigint null`, `periodic_fee_minor bigint default 0`; keduanya memakai currency parent debt
- `formula_version smallint`, `effective_from date`, audit/version fields

### `debt_ledger_entries`

- Projection/link saja, bukan monetary ledger atau source of truth.
- `id uuid`, `household_id`, `created_by`, `updated_by`, `debt_id`, `kind draw|principal_payment|capitalized_interest|capitalized_fee|adjustment_positive|adjustment_negative|reversal`
- `financial_entry_id uuid not null`, `account_entry_split_id uuid not null`, `category_entry_split_id uuid null`, `debt_payment_id uuid null`, `statement_id uuid null`
- Amount/currency dibaca dari referenced `entry_splits`; lifecycle/clearing serta `occurred_at`/`business_date` dibaca dari `financial_entries`. Kolom duplikat untuk nilai/status/waktu ledger dilarang.
- `idempotency_key uuid`, audit/version/tombstone fields; unique active `(debt_id,financial_entry_id,account_entry_split_id,kind)`.

### `debt_payments`

- `id uuid`, `household_id`, `created_by`, `updated_by`, `debt_id`, `payment_group_id uuid`
- `principal_entry_id uuid`, `interest_entry_id uuid null`, `fee_entry_id uuid null`, `other_expense_entry_id uuid null`
- Komponen amount/currency/lifecycle/clearing diturunkan dari entry/split tertaut; projection ini tidak menyimpan saldo atau cashflow kedua.
- Unique active `(debt_id,payment_group_id)`; seluruh entry dalam group harus household sama dan account line-nya dapat diakses pemanggil.

### `debt_statements`

- `id`, `household_id`, `created_by`, `updated_by`, `debt_id`, `statement_date`, `cutoff_at`
- `closing_balance_minor bigint`, `minimum_due_minor bigint null`, `currency_code char(3)`, `due_local_date null`
- `is_verified boolean`, `source manual|receipt`, `attachment_id uuid null`
- audit/version/tombstone fields.

### `debt_schedule_entries`

- Derived cache, bukan financial source of truth: `household_id`, `debt_id`, `scenario_id null`, `sequence_no`, `due_date`, opening/principal/interest/fee/payment/closing `_minor bigint`, `currency_code`, `formula_version`, `source_version`, audit/version/tombstone fields.
- RLS schedule mewarisi izin `debts.account_id`; row tidak boleh dibaca setelah account permission dicabut.

## Service, query, dan RPC

- `DebtBalanceCalculator.compute(financialEntries,entrySplits,projections,statement,asOf)` dan `AmortizationEngine.generate(terms,principal,scenario)` pure; decimal hanya untuk rate dan semua hasil uang dibulatkan ke bigint minor unit.
- `DebtRepository.observeDebt(id)` membaca SQLCipher reaktif.
- `rpc_create_debt(p_payload,p_idempotency_key)` memerlukan membership household dan helper account-access dengan `p_action='write'` bila account ditautkan.
- `rpc_record_debt_payment(p_debt_id,p_entry_payloads,p_expected_debt_version,p_idempotency_key)` membuat principal transfer, entry expense komponen terpisah, dan projection links secara atomik.
- `rpc_link_debt_payment(p_debt_id,p_financial_entry_ids,p_expected_debt_version,p_idempotency_key)` memvalidasi cap, household, dan helper action `write` pada setiap account line.
- `rpc_add_debt_statement(p_debt_id,p_payload,p_idempotency_key)` serta `rpc_reconcile_debt_statement(p_statement_id,p_confirmed_difference_minor,p_expected_version,p_idempotency_key)`.
- `rpc_get_debt_detail(p_debt_id,p_as_of)` mengembalikan actual/projected, components, due, FX/coverage flags.
- Schedule dapat dihitung on-device; server cache dipakai parity/export dan dibangun ulang saat term/source version berubah.

## Offline dan sinkronisasi

- Debt/terms/projection links/statements/schedule cache tersimpan SQLCipher; `financial_entries`/`entry_splits` tetap satu-satunya monetary ledger.
- Payment compound ditulis atomik lokal dan outbox sebagai satu command idempotent; tidak menyinkronkan child rows satu-satu.
- Server memvalidasi allocation cap, household, dan izin semua account line sumber. Rejection mengembalikan payment lokal ke draft review tanpa partial entry/split.
- Merge memakai server version/cursor. Statement/payment concurrent tidak di-auto-resolve bila mengubah cutoff sama; user memilih versi dan recompute.
- Derived schedule dan `debt_ledger_entries` projection aman dibuang/rebuild; canonical ledger/statement tidak.
- Perubahan `clearing_status pending→cleared|reconciled` atau `lifecycle_status→void` pada header memicu debt recompute.
- Offline forecast diberi `as_of`/formula version dan tidak diklaim sesuai statement terbaru.

## Keamanan dan privasi

- RLS seluruh entity memakai `household_id`; FK/trigger memastikan household konsisten dan memanggil `private.can_access_account(p_household_id,p_account_id,p_action)` dengan `read|write|manage` pada debt account serta setiap entry/account split/attachment tertaut.
- Service role tidak ada di client; RPC `SECURITY INVOKER` kecuali controlled worker yang tidak menerima arbitrary user ID.
- SQLCipher/SecureStore; lender/account identifiers dan notes terenkripsi aplikasi jika disimpan.
- Analytics/log/notification tidak memuat lender/debt name, balance, APR exact, due date exact, statement content, transaction ID.
- Attachment mengikuti signed URL singkat dan Storage RLS; tidak public.
- UI menampilkan disclaimer ringkas dekat schedule dan reconciliation, bukan hanya di Terms.

## States dan errors

- **Empty:** jelaskan tracking tidak menghubungi lender atau membayar otomatis.
- **Unreconciled:** last statement/as-of terlihat; actual formula tetap transparan.
- **Pending payment:** actual dan projected dipisah.
- **Paid off/credit balance:** tidak auto-archive; user meninjau nilai ≤0.
- **Negative amortization:** warning matematis dan no payoff date, tanpa memberi saran.
- **Missing FX:** native balance tampil; net worth base partial.
- **Compound save failure:** rollback seluruh child mutation lokal/server.
- **Conflict:** payment/statement draft dipertahankan untuk review.
- **Unauthorized:** generic not found.

## Analytics yang aman privasi

- Events: `debt_created`, `debt_viewed`, `debt_payment_attempted`, `debt_payment_result`, `debt_statement_reconciled`, `debt_scenario_viewed`.
- Allowlist: `kind`, `tracking_mode`, `has_terms`, `component_count`, `result`, `is_offline`, `reconciliation_state`, `negative_amortization_boolean`.
- Dilarang: amount/balance/APR/payment, debt/lender name, dates, account/transaction/statement IDs, attachment metadata.

## Acceptance criteria (Given–When–Then)

1. **Given** principal transfer dan entry expense interest/fee terpisah semuanya `posted+cleared`, **When** detail/report dihitung, **Then** outstanding 9.200.000; cashflow expense 200.000; principal 800.000 bukan expense.
2. **Given** header payment group masih `clearing_status=pending`, **When** detail dibuka, **Then** actual tetap 10.000.000 dan projected 9.200.000.
3. **Given** statement 9.500.000 dan calculated at cutoff 9.400.000, **When** reconcile dipreview, **Then** difference +100.000 dan tidak diterapkan sebelum konfirmasi.
4. **Given** fixed-rate zero APR, principal 1.200.000, 12 period, **When** schedule dibuat, **Then** principal payment 100.000 tiap period dan total interest nol.
5. **Given** scheduled payment ≤ interest + fee, **When** schedule dibuat, **Then** negative amortization true dan payoff date tidak ditampilkan.
6. **Given** retry payment setelah timeout dengan idempotency key sama, **When** server menerima, **Then** tepat satu transaction dan allocation tercipta.
7. **Given** debt currency tidak memiliki FX, **When** net worth dihitung, **Then** balance native tampil dan aggregate base partial, bukan nol.
8. **Given** user B mencoba menautkan entry pada account household yang tidak boleh ia akses, **When** RPC dipanggil, **Then** seluruh command ditolak atomik tanpa metadata.

## Test matrix

| Area | Kasus minimum | Level |
|---|---|---|
| Balance | draws, payment, capitalized items, reversal, credit balance | Unit/property |
| Payment | principal/interest/fee entries, lifecycle draft/posted/void, clearing pending/cleared/reconciled, FX residual | Unit/integration |
| Statement | cutoff, post-statement entries, difference/adjustment, concurrent edit | Integration |
| Amortization | zero/high APR, rounding, final payment, extra principal, negative amortization | Unit/golden |
| Classification | transfer exclusion, interest/fee budget/report, card purchase linkage | Contract |
| Offline | compound outbox, idempotent retry, rejection rollback, stale forecast | Integration/E2E |
| Security | household/non-member, restricted account/entry/attachment, permission revocation, RLS/RPC | SQL/security |
| UX/a11y | formula explanation, dynamic type, table/chart narration | Component/E2E |
| Performance | 100 debts, 600-period schedules, 50k entries | Benchmark |

## Implementation slices dan dependensi

1. **Slice A — Domain math:** signs, debt ledger, payment allocation, decimal amortization fixtures.
2. **Slice B — Schema/RLS:** debts/terms/projection links/statements, household/account-permission/cap/atomic constraints.
3. **Slice C — Local-first:** SQLCipher aggregates, compound outbox, schedule cache/rebuild.
4. **Slice D — Core UX:** create/list/detail, record/link payment, actual/projected states.
5. **Slice E — Statements:** input, cutoff calculation, explicit reconciliation workflow.
6. **Slice F — Forecast/reminders:** schedule/scenario, recurring/calendar link, generic notifications.
7. **Slice G — Hardening:** parity, security, accessibility, offline/concurrency/performance tests.

## Rollout dan kill-switch

- Flags: `debt_tracking_v1`, `debt_amortization_v1`, `debt_statements_v1`, `debt_reminders_v1`.
- Internal ledger/payment parity → beta read/write 10% → 50% → 100%; schedule dan statement menyusul terpisah.
- Guardrail: compound mutation rollback, balance mismatch, classification mismatch, schedule parity, reconciliation conflict, crash-free sessions.
- Kill-switch amortization menyembunyikan forecast/scenario namun actual ledger tetap aktif. Kill-switch write mengubah debt ke read-only dan mempertahankan draft outbox untuk retry setelah pulih.
- Shadow compare hanya formula version, boolean mismatch, dan bucket, tanpa balance/APR.
- Schema additive; derived schedule dapat dihapus/rebuild, ledger/statement/payment tidak dihapus saat rollback.
