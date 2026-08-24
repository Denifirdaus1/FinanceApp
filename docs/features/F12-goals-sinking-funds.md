# F12 — Goals & Sinking Funds

## Metadata

- **Status:** Siap implementasi
- **Fase:** Phase 3
- **Prioritas:** P1
- **Platform:** Expo React Native iOS/Android
- **Dependensi wajib:** akun, transaksi/transfer, kategori, kurs snapshot, Supabase RLS, SQLCipher; F13 Recurring untuk rencana kontribusi opsional

## Outcome dan JTBD

**Outcome:** pengguna dapat memecah target besar menjadi progres yang dapat dilacak tanpa mencampur saldo nyata, transfer, dan angka rencana.

**JTBD:** “Ketika menabung untuk kebutuhan tertentu, saya ingin menetapkan target, mencatat kontribusi/penarikan, dan melihat progres serta kebutuhan periodik supaya saya dapat merencanakan sendiri.”

Perhitungan kebutuhan kontribusi bersifat aritmetika informasional, bukan rekomendasi keuangan, investasi, atau jaminan pencapaian.

## Scope

- Goal tabungan dan sinking fund dengan nama, ikon/warna, currency, target amount, target date opsional.
- Tracking kontribusi dan withdrawal dari account split pada ledger berstatus posted, baik yang masih pending maupun sudah cleared/reconciled, atau dari manual opening adjustment.
- Link ke satu atau lebih account yang dapat diakses user; kandidat transfer masuk dapat disarankan untuk dihubungkan, tetapi tidak auto-count tanpa aturan/konfirmasi.
- Progres amount/percent, remaining, status, riwayat, dan kontribusi periodik yang diperlukan.
- Milestone 25/50/75/100% dan reminder opt-in.
- Reorder, pause, complete, archive, reopen.
- Overfunding dan target tanpa deadline.
- Offline CRUD dan tracking dengan sinkronisasi idempotent.

## Non-scope

- Rekening escrow/pot nyata, pemindahan uang, bunga/return, atau investasi.
- Saran target terbaik, rekomendasi menabung, atau auto-allocation berbasis profiling.
- Goal bersama/multi-user dan hadiah sosial tidak termasuk rilis awal fitur ini.
- Debt payoff math; dikelola F14, meskipun goal dapat menautkan tampilan ke debt tanpa double counting.
- Kurs live atau perubahan target historis berdasarkan inflasi.

## Kontrak dan istilah

- Semua nilai uang persisten memakai kolom `*_amount_minor bigint` + `*_currency_code char(3)` ISO-4217. `numeric` hanya boleh untuk FX rate dan koefisien persentase; kalkulasi/posting akhir dibulatkan deterministik ke minor unit.
- Ledger kanonis memakai satu header `financial_entries` dan line `entry_splits`. Header memiliki `entry_type=income|expense|transfer|balance_adjustment|refund|reversal`, `lifecycle_status=draft|posted|void`, `clearing_status=pending|cleared|reconciled`, `occurred_at timestamptz` sebagai instant kejadian, dan `business_date date` sebagai tanggal lokal untuk reporting/query.
- `entry_splits.line_type='account'|'category'`; `line_role` hanya metadata semantik dan tidak menentukan tanda atau dampak saldo. Account line memakai `amount_minor bigint`: positif menambah saldo dan negatif mengurangi saldo. Category line memakai `amount_minor bigint >0` untuk reporting/budget.
- Header refund menyimpan `related_entry_id`; header reversal menyimpan `reversal_of_entry_id`. Keduanya tervalidasi satu household dan tidak mengubah sign berdasarkan `line_role`.
- Transfer dikecualikan dari income/expense/cashflow konsolidasi. Biaya transfer, bila ada, wajib menjadi financial entry terpisah dengan `entry_type=expense`.
- Kontribusi ledger mereferensikan pasangan `financial_entries.id` + `entry_splits.id` dengan `line_type='account'`; tidak ada tabel/ID transfer leg. Satu source account split dipakai sebagai unit cap agar tidak double-count.
- Goal mempunyai satu `currency_code`; semua kontribusi dikonversi dengan snapshot immutable bila sumber berbeda currency.
- Kontribusi adalah alokasi eksplisit ke goal. State ledger-nya selalu diturunkan dari header: draft/void tidak dihitung, posted+pending masuk pending progress, dan posted+cleared/reconciled masuk actual.
- `opening_adjustment` hanya mengatur progres awal dan tidak mengubah saldo akun/cashflow; UI selalu memberi label “Penyesuaian awal/manual”.
- Semua row finance/planning membawa `household_id`, `created_by`, `updated_by`, timestamps, `version`, dan tombstone (`deleted_at`). RLS memerlukan membership household aktif; row yang menautkan account/entry membaca `account_permissions` melalui helper exact `private.can_access_account(p_household_id,p_account_id,p_action)`, dengan `p_action=read|write|manage`, untuk setiap account split terkait.

## UX flow

1. User menekan “Buat goal”, mengisi nama, target amount, currency, deadline opsional, dan cadence preferensi.
2. Preview menampilkan formula progress dan, bila ada deadline, kebutuhan rata-rata per period dengan label “perkiraan matematis”.
3. Setelah save, detail menunjukkan actual dari `clearing_status IN ('cleared','reconciled')`, pending dari `clearing_status='pending'`, remaining, target date, milestones, dan history.
4. “Tambah kontribusi” menawarkan: tautkan transaksi/transfer yang ada, buat transfer baru melalui alur transaksi, atau manual opening adjustment.
5. Kandidat transfer muncul dari account split bernilai positif pada account tujuan yang ditautkan dan belum dialokasikan; user memilih amount allocation sebelum count.
6. Withdrawal dibuat dengan memilih transaksi keluar atau manual correction; konfirmasi menjelaskan dampaknya pada progress.
7. Saat target tercapai, user memilih complete, menaikkan target, atau tetap overfunded.
8. Offline mutation terlihat segera dengan badge pending sync; status final diselaraskan setelah server menerima.

## Functional requirements

- **F12-FR-001:** Goal valid membutuhkan target amount >0 dan currency ISO-4217 yang didukung.
- **F12-FR-002:** Deadline opsional tidak boleh sebelum `start_local_date`; backdated import memakai flow khusus dan label historis.
- **F12-FR-003:** Progress actual hanya memakai opening/manual adjustment aktif serta allocation ledger dengan header `lifecycle_status='posted'` dan `clearing_status IN ('cleared','reconciled')`.
- **F12-FR-004:** Allocation dengan header posted+pending tampil sebagai `pending_progress`; header draft/void tidak masuk actual maupun pending.
- **F12-FR-005:** Satu account split dapat dialokasikan ke beberapa goal selama total allocation aktif tidak melebihi `abs(entry_splits.amount_minor)`.
- **F12-FR-006:** Transfer internal dapat menghitung kontribusi dari account split masuk, tetapi entry transfer tetap dikecualikan dari income/expense/cashflow/budget; fee memakai expense entry terpisah.
- **F12-FR-007:** `lifecycle_status='void'` atau tombstone pada source entry/split membuat allocation tidak eligible dan memicu recompute; allocation audit tetap sebagai tombstone.
- **F12-FR-008:** Milestone dikirim maksimal sekali per goal/milestone, kecuali goal di-reset eksplisit.
- **F12-FR-009:** Missing FX tidak dianggap nol dan menahan bagian progress terkait dalam state partial.
- **F12-FR-010:** Complete/archive tidak mengubah transaksi atau contribution ledger.
- **F12-FR-011:** Edit target menyimpan history sehingga chart/progres historis dapat dijelaskan.
- **F12-FR-012:** Reminder tidak menyebut nominal/nama goal pada lock screen kecuali user opt-in.
- **F12-FR-013:** Goal yang melewati deadline tidak otomatis gagal/closed; status menjadi `past_due_active`.
- **F12-FR-014:** Tidak ada copy yang mengklaim hasil, memberi tekanan, atau menyarankan produk finansial.

## Aturan perhitungan exact

- `actual_contributions = opening/manual adjustments aktif + Σ allocation contribution terkonversi dengan source header posted dan clearing cleared/reconciled`.
- `actual_withdrawals = Σ allocation withdrawal terkonversi dengan source header posted dan clearing cleared/reconciled`.
- `current_amount = actual_contributions - actual_withdrawals` dan boleh negatif untuk mencerminkan koreksi; progress visual minimum 0.
- `pending_delta = Σ contribution - Σ withdrawal` hanya untuk source header posted dengan `clearing_status='pending'`; header draft/void selalu dikecualikan.
- `remaining = max(target_amount - current_amount, 0)`.
- `raw_progress_percent = current_amount / target_amount × 100`.
- Progress bar di-clamp `[0,100]`; label dapat menunjukkan nilai negatif sebagai 0% dan overfunded sebagai `>100%` plus nominal kelebihan.
- `overfunded = max(current_amount - target_amount, 0)`.
- Milestone tercapai ketika prior actual `< threshold` dan actual baru `>= target × threshold`; pembulatan threshold memakai ceiling ke minor unit.

### Kebutuhan periodik

- Hanya dihitung bila deadline > today dan remaining >0.
- Daily: `ceil(remaining / remaining_calendar_days_inclusive)`.
- Weekly: `ceil(remaining / ceil(remaining_calendar_days_inclusive / 7))`.
- Monthly: jumlah contribution dates dari cadence berikutnya sampai deadline, minimum 1; `ceil(remaining / periods_remaining)`.
- Pending tidak mengurangi remaining actual; UI dapat menampilkan skenario “setelah pending” terpisah.
- Bila deadline hari ini/past due, required periodic bernilai `null`; tampilkan remaining aktual tanpa rekomendasi.

### Eligibility dan currency

- Allocation harus menunjuk pasangan header + account split dalam household yang sama, atau `source_type=opening_adjustment|manual_correction`; pasangan FK memastikan split benar-benar milik header.
- Untuk `entry_type='transfer'`, account split positif eligible sebagai contribution dan account split negatif sebagai withdrawal; satu transfer tidak boleh menghitung kedua arah pada goal yang sama.
- Header income/expense dapat dialokasikan jika user eksplisit memilih account split-nya; ini tidak mengubah `entry_type` atau category splits.
- Same currency memakai native minor unit; berbeda currency memakai `goal_amount_minor` + `fx_rate_snapshot_id` pada effective date.
- Missing FX allocation tetap tersimpan `unconverted`, tidak masuk actual/pending hingga rate tersedia.
- Total allocation eligible terhadap satu account split ≤ `abs(amount_minor)`; constraint diperiksa atomik server dan lokal setelah membership household serta akses seluruh account split pada entry divalidasi.

## Entitas dan fields

### `goals`

- `id uuid pk`, `household_id uuid`, `name text` (1–80), `kind savings|sinking_fund`
- `currency_code char(3)`, `target_amount_minor bigint >0`
- `start_local_date date`, `target_local_date date null`, `timezone text`
- `preferred_cadence none|weekly|monthly`, `preferred_contribution_day smallint null`
- `goal_status active|paused|completed|past_due_active|archived`
- `icon_key text`, `color_token text`, `sort_order integer`
- `created_by uuid`, `updated_by uuid`, `created_at`, `updated_at`, `version`, `deleted_at`

### `goal_account_links`

- `household_id`, `goal_id`, `account_id`, `candidate_rule manual_only|suggest_incoming`
- `created_by`, `updated_by`, `created_at`, `updated_at`, `version`, `deleted_at`; unique active `(goal_id,account_id)`; read wajib lolos `private.can_access_account(household_id,account_id,'read')` dan write wajib lolos `private.can_access_account(household_id,account_id,'write')`.

### `goal_contributions`

- `id uuid pk`, `household_id`, `goal_id`
- `kind contribution|withdrawal|opening_adjustment|manual_correction`
- `source_type ledger_account_split|opening_adjustment|manual_correction`
- `financial_entry_id uuid null`, `account_entry_split_id uuid null`; keduanya wajib untuk source ledger dan null untuk source manual, dengan FK pasangan ke `entry_splits.line_type='account'` milik entry yang sama.
- `native_amount_minor bigint >0`, `native_currency_code char(3)`
- `goal_amount_minor bigint null`, `goal_currency_code char(3)`, `fx_rate_snapshot_id uuid null`
- `effective_local_date date`, `conversion_status converted|missing_rate`; tidak menyimpan salinan lifecycle/clearing source.
- `note_ciphertext text null`, `idempotency_key uuid`, `created_by`, `updated_by`, timestamps, `version`, `deleted_at`

### `goal_target_history`

- `id uuid`, `household_id`, `goal_id`, `effective_at timestamptz`
- `old_target_amount_minor bigint`, `new_target_amount_minor bigint`, `currency_code char(3)`, `old_date`, `new_date`
- `reason_code user_edit|reopen`, `created_by`, `updated_by`, `created_at`, `updated_at`, `version`, `deleted_at`; perubahan bisnis append-only, tombstone hanya untuk administrasi terkontrol.

### `goal_milestone_events`

- `household_id`, `goal_id`, `threshold smallint`, `goal_cycle integer`
- `reached_at`, `source_version`, `created_by`, `updated_by`, timestamps, `version`, `deleted_at`; unique active `(goal_id,threshold,goal_cycle)`.

## Service, query, dan RPC

- `GoalCalculator.compute(goal, allocations, asOf)` pure dan integer-only.
- `GoalRepository.observeGoals()` serta `observeGoalDetail(id)` membaca SQLCipher reaktif.
- `rpc_create_goal(p_payload,p_mutation_id,p_idempotency_key)` memvalidasi target/date/currency.
- `rpc_allocate_to_goal(p_goal_id,p_financial_entry_id,p_account_entry_split_id,p_amount_minor,p_expected_version,p_mutation_id,p_idempotency_key)` mengunci split, memvalidasi household/access/cap, lalu insert atomik.
- `rpc_get_goal_detail(p_goal_id,p_as_of)` mengembalikan progress, pending, missing FX, history, dan source version.
- `rpc_update_goal_target(p_goal_id,p_payload,p_expected_version,p_mutation_id,p_idempotency_key)` menulis goal + target history dalam satu transaction.
- `rpc_recompute_goal(p_goal_id,p_expected_version,p_mutation_id,p_idempotency_key)` idempotent dan menghasilkan milestone outbox tanpa duplicate.
- Query kandidat transfer memfilter `financial_entries(household_id,entry_type,lifecycle_status,clearing_status,occurred_at,business_date)`, join account `entry_splits(line_type,account_id,amount_minor)`, menerapkan `private.can_access_account(household_id,account_id,'read')` sebelum anti-join allocation aktif.
- Seluruh RPC yang mengubah state wajib menerima `p_mutation_id` dan `p_idempotency_key`; update/delete/transition juga wajib menerima serta mengunci `p_expected_version`.

## Offline dan sinkronisasi

- Goal, links, allocation, target history, dan aggregate terotorisasi disimpan di SQLCipher; cache account yang aksesnya dicabut wajib dipurge sebelum recompute.
- `mutation_id` UUID dan idempotency key dibuat client; local allocation cap dicek dalam satu DB transaction.
- Server tetap authoritative terhadap cap lintas device. Bila allocation kedua menyebabkan over-allocation, server menolak hanya mutation tersebut dan UI mengembalikannya ke rejected-mutation review.
- Merge memakai `version`/server cursor; `lifecycle_status` dan `clearing_status` header dibaca saat recompute, bukan disalin ke allocation.
- Tombstone mempertahankan audit dan mencegah allocation muncul kembali dari device lama.
- Missing FX direcompute ketika rate delta tiba.
- Reminder lokal dijadwalkan ulang dari versi goal terbaru; server push dedupe memakai goal/version/schedule key.

## Keamanan dan privasi

- RLS pada goal, link, allocation, history, dan milestone memerlukan membership aktif pada `household_id`; FK/trigger menjamin goal, entry, split, account, dan FX snapshot berada dalam household yang sama.
- Setiap read/write/manage link atau allocation wajib mengevaluasi `account_permissions` lewat `private.can_access_account(p_household_id,p_account_id,p_action)` dengan action yang sesuai untuk seluruh account split pada entry tertaut; RPC memakai `SECURITY INVOKER` dan ID terlarang ditolak tanpa metadata.
- Derived progress, milestone, candidate, dan aggregate memfilter row/entry terotorisasi sebelum agregasi; cache/materialized view tidak boleh mengungkap amount, count, identifier, atau delta dari restricted account.
- RPC tidak menerima nominal konversi sebagai trusted input; server memvalidasi terhadap FX snapshot yang dapat diakses household.
- SQLCipher + SecureStore; note dienkripsi sebelum sync jika disimpan.
- Nama goal, amount, deadline, account, note, dan progress tidak masuk analytics/log/crash breadcrumb.
- Lock-screen notification generik default; deep link tetap melewati auth/biometric/RLS.
- Tidak ada wording “harus”, rekomendasi produk, prediksi hasil, atau tekanan finansial.

## States dan errors

- **Empty:** CTA buat goal dengan penjelasan bahwa goal tidak memindahkan uang.
- **Active/on track:** label deskriptif berdasarkan schedule user, bukan penilaian finansial.
- **Past due:** tetap aktif dengan opsi ubah date/complete; tidak auto-fail.
- **Overfunded/negative:** tampilkan nilai actual dan penjelasan.
- **Pending/unconverted:** section terpisah; headline actual stabil.
- **Source changed/void:** lifecycle source berubah atau menjadi void; allocation ditandai perlu review dan progress direcompute.
- **Over-allocation conflict:** mutation masuk rejected-mutation review; financial entry asli tidak diubah.
- **Offline/stale:** `as_of` terlihat; aksi tetap masuk outbox.
- **Unauthorized:** generic not found tanpa nama/nominal.

## Analytics yang aman privasi

- Events: `goal_created`, `goal_viewed`, `goal_allocation_attempted`, `goal_allocation_result`, `goal_milestone_reached`, `goal_status_changed`.
- Allowlist: `kind`, `has_deadline`, `cadence`, `source_type`, `status_transition`, `milestone_bucket`, `is_offline`, `result`.
- Dilarang: amount, currency balance, goal/name/note, exact dates, account/transaction IDs, percent exact.
- Milestone hanya bucket `25|50|75|100_plus`; event non-esensial tunduk pada consent/opt-out.

## Acceptance criteria (Given–When–Then)

1. **Given** target 1.000.000, contribution posted+cleared 400.000, withdrawal posted+cleared 50.000, dan contribution posted+pending 100.000, **When** detail dibuka, **Then** actual 350.000, pending +100.000, remaining 650.000.
2. **Given** transfer internal 200.000 dialokasikan dari account split tujuan bernilai positif, **When** goal dan cashflow dihitung, **Then** goal bertambah 200.000 dan income/cashflow tidak berubah.
3. **Given** target 100.000 dan actual 125.000, **When** tampil, **Then** bar 100%, raw progress 125%, overfunded 25.000.
4. **Given** deadline sudah lewat, **When** goal dibuka, **Then** required periodic null dan goal berstatus past-due-active, bukan gagal.
5. **Given** dua device mencoba mengalokasikan total melebihi transaction amount, **When** server sinkron, **Then** satu mutation ditolak untuk review dan total accepted tidak melebihi source.
6. **Given** allocation asing tanpa FX, **When** progress dihitung, **Then** allocation tampil unconverted dan tidak dianggap nol/actual.
7. **Given** user B mengirim entry dari household lain atau account private yang tidak dapat diakses ke RPC, **When** request dijalankan, **Then** ditolak tanpa metadata dan derived progress tidak berubah.
8. **Given** milestone 50% sudah tercatat lalu progress turun dan naik lagi, **When** cycle sama, **Then** reminder 50% tidak dikirim ulang.

## Test matrix

| Area | Kasus minimum | Level |
|---|---|---|
| Progress | contribution, withdrawal, opening, negative, overfunded | Unit/property |
| Schedule | daily/weekly/monthly, deadline today/past, leap day | Unit |
| Eligibility | income/expense, transfer account splits dengan `amount_minor` positif/negatif, split allocation, draft/void source | Unit/integration |
| Currency | same/foreign, missing FX, zero/three decimals, rounding | Unit/property |
| Concurrency | multi-device over-allocation, idempotent retry, target edit | Integration |
| Offline | CRUD/allocation, stale source, tombstone, reminder reschedule | Integration/E2E |
| RLS/privacy | cross-household dan restricted account/entry, derived aggregate, notification, analytics payload | SQL/security |
| UX/a11y | dynamic type, screen reader progress, non-color milestones | Component/E2E |
| Performance | 100 goals, 10k allocations, candidate query | Benchmark |

## Implementation slices dan dependensi

1. **Slice A — Domain math:** progress, required-periodic schedule, eligibility/cap, milestone fixtures.
2. **Slice B — Schema/RLS:** goals, links, allocations, history, household consistency, account-permission SQL tests.
3. **Slice C — Local-first:** SQLCipher, reactive aggregate, outbox/idempotency, rejected mutation review.
4. **Slice D — Goal UX:** create/edit/list/detail/history, states, accessibility.
5. **Slice E — Transaction linking:** candidate transfer, split allocation, FX/missing-state, drill-down.
6. **Slice F — Milestone/reminders:** dedupe ledger, generic notification, lifecycle rescheduling.
7. **Slice G — Hardening:** server parity, conflict/E2E, security and analytics validation.

## Rollout dan kill-switch

- Flags: `goals_v1`, `goal_transaction_linking_v1`, `goal_reminders_v1`.
- Rollout internal → beta 10% → 50% → 100%; transaction linking/reminders setelah core manual tracking stabil.
- Guardrail: aggregate mismatch, allocation rejection/conflict, duplicate milestone, reminder error, crash-free sessions.
- Shadow compare hanya mengirim boolean mismatch dan formula version, tanpa amount/name/source ID.
- Kill-switch linking mengubah UI ke read-only/manual opening correction; tidak memutus allocation lama. Kill-switch reminder menghentikan jadwal baru dan membatalkan notification terjadwal.
- Schema additive; derived aggregates/milestones dapat direbuild, target dan allocation ledger tidak dihapus saat rollback.
