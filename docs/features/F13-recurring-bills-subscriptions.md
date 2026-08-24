# F13 — Recurring Bills & Subscriptions

## Metadata

- **Status:** Siap implementasi
- **Fase:** Phase 2–3
- **Prioritas:** P1
- **Platform:** Expo React Native iOS/Android
- **Dependensi wajib:** transaksi, akun, kategori, notification permission, Supabase RLS, SQLCipher; F15 Calendar/Forecast sebagai consumer

## Outcome dan JTBD

**Outcome:** pengguna dapat mengetahui kewajiban/pemasukan berulang yang akan datang, menerima pengingat aman, dan mencocokkannya dengan transaksi aktual tanpa membuat transaksi atau pembayaran ganda.

**JTBD:** “Ketika memiliki tagihan, langganan, atau pemasukan rutin, saya ingin jadwal dan estimasinya tercatat serta dapat ditandai lewat transaksi aktual supaya tidak lupa dan forecast saya tetap akurat.”

Fitur tidak membayar tagihan atau membatalkan langganan; seluruh informasi jadwal bukan nasihat finansial.

## Scope

- Rule berulang untuk expense, income, dan transfer.
- Cadence daily, weekly, monthly, yearly dengan interval, anchor, end condition, dan timezone.
- Monthly end-of-month behavior `clamp` atau `skip`; penyesuaian weekend opsional.
- Fixed amount atau estimasi variable berdasarkan histori match.
- Materialisasi occurrence, upcoming list, kalender, mark skipped, snooze reminder.
- Matching manual/suggested terhadap financial entry posted dengan clearing pending/cleared/reconciled; satu entry hanya match satu occurrence rule yang sama.
- Reminder lokal/push dengan preview privat.
- Status active, paused, ended, archived; riwayat tidak hilang.
- Alert perubahan amount aktual terhadap estimasi.
- Offline create/edit/match/skip dan sinkronisasi idempotent.

## Non-scope

- Auto-pay, direct debit, pembatalan layanan, atau komunikasi dengan biller.
- Auto-create transaksi actual tanpa konfirmasi/match.
- Scraping email/SMS/bank dan deteksi subscription otomatis tidak termasuk rilis awal fitur ini.
- Kalender hari libur bank; adjustment hanya hari Sabtu/Minggu.
- Prorata kontrak, pajak invoice, atau accounting accrual.

## Kontrak lintas fitur

- Semua nilai uang persisten memakai `*_amount_minor bigint` + `*_currency_code char(3)` ISO-4217. `numeric` hanya untuk FX rate dan koefisien persentase; hasil forecast/match dibulatkan deterministik ke minor unit.
- Ledger kanonis memakai satu header `financial_entries` dan line `entry_splits`; occurrence matched menunjuk header entry dan tidak menyalin amount atau state ledger.
- Header memakai `entry_type=income|expense|transfer|balance_adjustment|refund|reversal`, `lifecycle_status=draft|posted|void`, `clearing_status=pending|cleared|reconciled`, `occurred_at timestamptz` sebagai instant kejadian, dan `business_date date` sebagai tanggal lokal untuk reporting/matching. Recurring rule rilis ini hanya dapat menargetkan subset `income|expense|transfer`.
- `entry_splits.line_type='account'|'category'`; `line_role` hanya metadata semantik dan tidak menentukan tanda/dampak saldo. Account line memakai `amount_minor bigint`, positif menambah saldo dan negatif mengurangi saldo; category line memakai `amount_minor bigint >0` untuk reporting/budget.
- Header refund menyimpan `related_entry_id`; header reversal menyimpan `reversal_of_entry_id`. Keduanya tervalidasi satu household dan tidak mengubah sign berdasarkan `line_role`.
- Occurrence adalah proyeksi, bukan transaksi. Hanya match ke header posted dengan clearing cleared/reconciled yang masuk actual cashflow/budget/saldo; posted+pending tetap committed/pending.
- Transfer recurring mengubah saldo/forecast dari signed account splits tetapi dikecualikan dari consolidated income/expense/cashflow. Fee transfer, bila ada, dibuat sebagai expense entry terpisah.
- `due_local_date` disimpan berdasarkan timezone IANA rule. Perubahan timezone/rule bersifat versioned dan tidak menulis ulang occurrence matched/historis.
- Semua entity finance/planning membawa `household_id`, `created_by`, `updated_by`, timestamps, `version`, dan tombstone. RLS memerlukan membership household aktif serta evaluasi `account_permissions` melalui helper exact `private.can_access_account(p_household_id,p_account_id,p_action)`, dengan `p_action=read|write|manage`, untuk setiap account pada rule/entry tertaut.

## UX flow

1. User membuat recurring item dari kosong atau dari transaksi yang sudah ada.
2. Form meminta nama, type, amount model, currency, account/category opsional, cadence, due date, timezone, reminder, dan end condition.
3. Preview menampilkan enam occurrence berikutnya agar aturan kalender dapat diverifikasi sebelum save.
4. Upcoming list mengelompokkan overdue, hari ini, 7 hari, dan nanti; amount variable diberi label estimasi.
5. Saat transaction kandidat muncul, UI menawarkan match dengan alasan ringkas (tanggal/amount/payee) dan user mengonfirmasi.
6. Match ke header posted+pending menghasilkan `matched_pending`; setelah clearing menjadi cleared/reconciled occurrence menjadi paid/received. Header draft/void atau unmatch mengembalikan occurrence ke due/overdue.
7. User dapat skip satu occurrence, pause rule, atau edit “hanya occurrence ini / mulai occurrence berikutnya”.
8. Reminder dapat disnooze tanpa mengubah due date. Tap notification melewati auth lalu membuka occurrence.

## Functional requirements

- **F13-FR-001:** Rule menghasilkan occurrence deterministik dan idempotent berdasarkan rule version + nominal anchor.
- **F13-FR-002:** Preview dan server materializer memakai recurrence engine/fixture yang sama.
- **F13-FR-003:** Occurrence tidak pernah dianggap actual sebelum match ke header dengan `lifecycle_status='posted'` dan `clearing_status IN ('cleared','reconciled')`.
- **F13-FR-004:** Match ke header posted+pending dipisahkan dari paid/received dan tidak menutup occurrence secara final; draft/void tidak dihitung.
- **F13-FR-005:** Matching default hanya suggestion + konfirmasi; fuzzy auto-match tidak termasuk rilis awal fitur ini.
- **F13-FR-006:** Exact duplicate match ditolak atomik; retry dengan idempotency key mengembalikan hasil sama.
- **F13-FR-007:** Edit rule memakai effective date; occurrence historis/matched mempertahankan rule version lama.
- **F13-FR-008:** Skip tidak membuat transaction dan tidak menggeser anchor occurrence berikutnya.
- **F13-FR-009:** Reminder dedupe per occurrence/channel/offset; snooze membuat reminder instance baru maksimal sampai 30 hari setelah due.
- **F13-FR-010:** Variable estimate transparan menyebut metode dan jumlah sample, tanpa dianggap tagihan pasti.
- **F13-FR-011:** Amount change alert memakai actual matched vs estimate dan hanya satu kali per occurrence.
- **F13-FR-012:** Pause menghentikan materialisasi/reminder baru, bukan menghapus upcoming yang sudah dibuat; occurrence future diberi `paused` dan dapat dipulihkan.
- **F13-FR-013:** Ended/archive mempertahankan history dan transaction matches.
- **F13-FR-014:** UI/list/calendar dapat dibaca offline berdasarkan occurrence horizon lokal.

## Aturan recurrence exact

### Nominal dates

- Semua rule memiliki `anchor_local_date`, `interval >=1`, dan `frequency`.
- Daily: `anchor + n × interval hari`.
- Weekly: setiap weekday terpilih dalam minggu berinterval; minggu dimulai sesuai setting user (default Senin), tetapi interval dihitung dari minggu anchor.
- Monthly: bulan `anchor + n × interval bulan`, memakai `day_of_month` 1–31 atau `is_month_end=true`.
- Yearly: bulan+tanggal anchor setiap `interval` tahun.
- `count_limit` menghitung nominal occurrence sebelum weekend adjustment; `until_local_date` membatasi nominal date inklusif.
- Leap day yearly: `clamp` menghasilkan 28 Februari pada non-leap; `skip` melewatkan tahun tersebut.

### Invalid day dan weekend

- `day_policy=clamp`: tanggal 29/30/31 yang tidak ada menjadi hari terakhir bulan.
- `day_policy=skip`: occurrence bulan itu tidak dibuat.
- Weekend adjustment diterapkan setelah nominal date: `none`, `previous_weekday`, atau `next_weekday`.
- Occurrence identity memakai nominal date, bukan adjusted due date, sehingga adjustment tidak menggeser cadence.
- Jika adjustment melintasi bulan, due date boleh berada di bulan tetangga; occurrence tetap milik nominal period awal.
- Tidak ada holiday adjustment tanpa kalender eksplisit.

### Amount estimate

- `fixed`: `estimated_amount_minor = configured_amount_minor`.
- `last_settled`: amount dari account split pada match posted+cleared/reconciled terbaru sebelum nominal date; fallback configured amount.
- `rolling_3`: rounded half-away-from-zero dari rata-rata integer tiga match posted+cleared/reconciled terbaru; jika 1–2 sample gunakan semua; jika nol fallback configured amount.
- Header refund/reversal/void dan account split transfer sisi lawan tidak menjadi sample.
- FX tidak mengubah native estimate rule. Forecast base memakai FX snapshot forecast bila tersedia; jika tidak, tampil native + missing FX.

## Aturan state dan matching

- Occurrence state: `scheduled` (future), `due` (today), `overdue` (past, belum selesai), `matched_pending`, `settled`, `skipped`, `cancelled`, `paused`.
- Rule expense menjadi `settled=paid`; income menjadi `settled=received`; transfer settled jika header serta kedua account split dengan `amount_minor` berlawanan tanda valid dan clearing cleared/reconciled.
- Candidate harus `household_id` sama, `entry_type` sama, currency sama, `lifecycle_status='posted'`, `clearing_status IN ('pending','cleared','reconciled')`, seluruh account split dapat diakses, dan belum matched ke occurrence lain yang incompatible.
- Default candidate window membandingkan `financial_entries.business_date` dengan `due_local_date - 3 hari` sampai `due_local_date + 7 hari`; user dapat mengatur 0–30 hari.
- Amount tolerance: `max(configured_absolute_tolerance_amount_minor, round(estimated × percentage_tolerance / 100))`; default absolute 0 dan persentase 10%.
- Ranking suggestion: exact normalized payee + amount + nearest date; score hanya mengurutkan dan tidak memutuskan otomatis.
- Confirm match hanya menyimpan referensi header dan audit match. Amount serta state actual selalu dihitung dari ledger terotorisasi; unmatch diperbolehkan dan occurrence state direcompute.
- Occurrence skipped tidak menjadi overdue. Jika transaction kemudian dipilih, user harus unskip sebelum match.
- Actual difference: `derived_actual_amount_minor - estimated_amount_minor`; alert bila `abs(diff) > max(alert_absolute_threshold_amount_minor, estimated_amount_minor × alert_percentage_threshold / 100)`.

## Entitas dan fields

### `recurring_rules`

- `id uuid pk`, `household_id uuid`, `name text` (1–80)
- `entry_type income|expense|transfer`, `currency_code char(3)`
- `amount_mode fixed|last_settled|rolling_3`, `configured_amount_minor bigint >=0`
- `frequency daily|weekly|monthly|yearly`, `interval smallint` (1–52)
- `anchor_local_date date`, `weekdays smallint[] null`, `day_of_month smallint null`, `is_month_end boolean`
- `day_policy clamp|skip`, `weekend_policy none|previous_weekday|next_weekday`
- `timezone text`, `until_local_date date null`, `count_limit integer null`
- `account_id uuid null`, `destination_account_id uuid null`, `category_id uuid null`, `payee_ciphertext text null`
- `rule_status active|paused|ended|archived`, `rule_version integer`
- `percentage_tolerance numeric`, `alert_percentage_threshold numeric`; `configured_absolute_tolerance_amount_minor bigint` dan `alert_absolute_threshold_amount_minor bigint` memakai `currency_code` rule.
- `created_by`, `updated_by`, timestamps, `version`, `deleted_at`

### `recurring_occurrences`

- `id uuid pk`, `household_id`, `rule_id`, `rule_version`
- `sequence_no integer`, `nominal_local_date`, `due_local_date`, `timezone`
- `estimated_amount_minor`, `currency_code`, `estimate_method`, `sample_count`
- `user_state active|skipped|cancelled|paused`, `matched_financial_entry_id uuid null`, `matched_at timestamptz null`, `matched_by uuid null`
- `display_state scheduled|due|overdue|matched_pending|settled|skipped|cancelled|paused` bersifat derived dari tanggal, `user_state`, dan lifecycle/clearing header; tidak menyimpan salinan actual amount/settled state.
- `source_version`, `created_by`, `updated_by`, timestamps, `version`, `deleted_at`
- Unique `(rule_id,rule_version,sequence_no)` dan `(rule_id,rule_version,nominal_local_date)`.

### `recurring_rule_versions`

- `household_id`, snapshot append-only rule fields, `effective_from_nominal_date`, `created_by`, `updated_by`, timestamps, `version`, `deleted_at`, `replaced_by_version`.

### `recurring_reminders`

- `id`, `household_id`, `occurrence_id`, `channel local|push`
- `offset_minutes integer`, `scheduled_for`, `state scheduled|sent|cancelled|failed`
- `snooze_count`, `dedupe_key text unique`, `created_by`, `updated_by`, timestamps, `version`, `deleted_at`.

## Service, query, dan RPC

- `RecurrenceEngine.expand(rule, from, to)` pure, timezone-aware, shared fixtures local/server.
- `RecurringRepository.observeUpcoming(range)` membaca SQLCipher.
- `rpc_upsert_recurring_rule(p_payload,p_effective_mode,p_expected_version,p_mutation_id,p_idempotency_key)`.
- `rpc_materialize_recurring_occurrences(p_rule_id,p_from,p_to,p_expected_version,p_mutation_id,p_idempotency_key)` idempotent, horizon server default 12 bulan.
- `rpc_get_recurring_candidates(p_occurrence_id,p_cursor)` memvalidasi household dan account access sebelum mengembalikan kandidat/alasan, tanpa fuzzy text ke analytics.
- `rpc_match_recurring_occurrence(p_occurrence_id,p_financial_entry_id,p_expected_version,p_mutation_id,p_idempotency_key)` atomik.
- `rpc_unmatch_recurring_occurrence(p_occurrence_id,p_expected_version,p_mutation_id,p_idempotency_key)` atomik.
- `rpc_skip_occurrence(p_occurrence_id,p_expected_version,p_mutation_id,p_idempotency_key)` dan `rpc_snooze_recurring_reminder(p_reminder_id,p_snooze_until,p_expected_version,p_mutation_id,p_idempotency_key)`.
- Seluruh RPC yang mengubah state wajib menerima `p_mutation_id` dan `p_idempotency_key`; update/delete/transition juga wajib menerima serta mengunci `p_expected_version`.
- Scheduled worker mematerialisasi 90 hari ke depan harian dan notification outbox; aplikasi menjaga horizon lokal minimum 60 hari.

## Offline dan sinkronisasi

- Rule/versions/occurrences/reminder metadata/matches disimpan di SQLCipher.
- Local engine mematerialisasi horizon 60 hari saat create/edit/offline; server identity deterministik mencegah duplikasi.
- Mutation memakai client-generated `mutation_id`, idempotency key, dan outbox. Match lokal optimistis, tetapi financial entry + splits tetap actual source of truth.
- Jika server menolak karena entry sudah matched di device lain atau akses account berubah, local occurrence kembali ke state sebelumnya dan muncul review tanpa metadata restricted.
- Server cursor/version mengalahkan timestamp perangkat. Concurrent rule edit menjadi conflict copy; matched history tidak di-rebase.
- Reminder lokal dijadwal ulang setelah merge; dedupe key mencegah local+push ganda bila app dapat mendeteksi receipt.
- Occurrence derived di luar history aman dibangun ulang dari row yang terotorisasi; skip/match adalah user state dan tidak boleh hilang saat rebuild. Cache account yang aksesnya dicabut wajib dipurge sebelum recompute.

## Keamanan dan privasi

- RLS pada rule, version, occurrence, reminder, dan entry link memerlukan membership aktif pada `household_id`; FK/trigger menjamin seluruh referensi berada dalam household yang sama.
- Rule yang menautkan account dan setiap matched entry wajib mengevaluasi `account_permissions` lewat `private.can_access_account(p_household_id,p_account_id,p_action)` dengan action yang sesuai untuk seluruh account split terkait; RPC `SECURITY INVOKER` menolak ID terlarang tanpa metadata.
- Derived upcoming state, estimate sample, actual difference, forecast, candidate, dan reminder memfilter akses sebelum agregasi/materialisasi; restricted account tidak boleh bocor lewat amount, count, identifier, ranking, notification, atau delta.
- Payee/note sensitif dienkripsi aplikasi sebelum sync; normalized match token berupa keyed hash per-household dengan access scope, bukan plaintext global.
- Push default generik “Ada jadwal keuangan yang perlu ditinjau”; nama/amount opt-in dan hanya pada unlocked preview.
- Scheduler/service-role hanya memproses row melalui audited function; tidak mengirim detail ke log.
- Analytics/crash log tidak memuat amount, payee, rule name, due date exact, transaction ID, atau notification text.
- Tidak ada auto-pay, cancellation claim, atau nasihat pengeluaran.

## States dan errors

- **Empty:** CTA buat manual/dari transaksi, dengan penjelasan bahwa item tidak membayar otomatis.
- **Upcoming/due/overdue:** label tanggal/timezone jelas; overdue tidak bernada menghukum.
- **Variable estimate:** badge “Estimasi” + metode/sample.
- **Matched pending:** menunggu `clearing_status` menjadi cleared/reconciled; `lifecycle_status='void'` mengembalikan ke due/overdue.
- **Paused/ended/archived:** history tetap dapat dibaca.
- **Partial FX:** native amount tampil dan forecast base partial.
- **Rule conflict:** pertahankan server + local copy; occurrences matched tidak berubah.
- **Permission denied:** reminder lokal tetap dapat dilihat in-app tanpa meminta permission berulang.
- **Materialization failure:** last horizon tetap tampil dan retry incremental.

## Analytics yang aman privasi

- Events: `recurring_rule_created`, `recurring_upcoming_viewed`, `recurring_match_suggested`, `recurring_match_result`, `recurring_occurrence_skipped`, `recurring_reminder_result`.
- Allowlist: `entry_type`, `frequency`, `amount_mode`, `state`, `candidate_count_bucket`, `date_distance_bucket`, `result`, `is_offline`, `notification_channel`.
- Dilarang: amount, currency total, names/payee, exact due date, account/category/transaction/rule IDs, transcript/OCR.

## Acceptance criteria (Given–When–Then)

1. **Given** monthly rule tanggal 31 dengan clamp, **When** Februari non-leap diekspansi, **Then** occurrence nominal/due 28 Februari dan Maret kembali tanggal 31.
2. **Given** rule tanggal Sabtu dengan next-weekday, **When** occurrence dibuat, **Then** nominal tetap Sabtu dan due Senin tanpa menggeser cadence berikutnya.
3. **Given** occurrence expense 100.000 dan header posted+pending cocok, **When** dimatch, **Then** state matched-pending dan actual budget/cashflow belum berubah.
4. **Given** occurrence sudah match ke header posted+cleared/reconciled, **When** materializer/retry berjalan, **Then** tidak ada occurrence atau match ganda.
5. **Given** rolling-3 actual 90k, 100k, 110k, **When** next estimate dihitung, **Then** estimate 100k dengan sample_count 3.
6. **Given** transfer recurring settled, **When** dihitung, **Then** saldo akun/forecast berubah dari account split `amount_minor` positif/negatif namun consolidated income/expense/cashflow tetap nol dan fee terpisah sebagai expense.
7. **Given** user B mencoba match occurrence dengan entry household lain atau restricted account, **When** RPC dipanggil, **Then** ditolak tanpa metadata dan derived state tidak berubah.
8. **Given** notification preview default, **When** layar terkunci, **Then** tidak ada nama rule atau nominal.

## Test matrix

| Area | Kasus minimum | Level |
|---|---|---|
| Recurrence | interval, weekdays, 29/30/31, leap day, end/count | Unit/property |
| Calendar | clamp/skip, previous/next weekday, timezone/DST | Unit |
| Estimates | fixed/last-settled/rolling, 0–3 sample, rounding, refund/reversal exclusion | Unit |
| Matching | posted+pending→cleared/reconciled, draft/void, unmatch, duplicate/concurrent match | Integration |
| Classification | income/expense/transfer and budget/cashflow effects | Contract |
| Offline | local horizon, edit conflict, skip/match outbox, rebuild | Integration/E2E |
| Security | RLS cross-household/restricted account-entry, derived-state isolation, hashed payee, generic notification | SQL/security |
| UX/a11y | calendar/list, dynamic type, screen reader state | Component/E2E |
| Performance | 1k rules, 12-month materialization, candidate index | Benchmark |

## Implementation slices dan dependensi

1. **Slice A — Recurrence engine:** nominal date, policies, timezone, golden fixtures.
2. **Slice B — Schema/RLS:** rules/versions/occurrences/reminders, uniqueness, household consistency, account-permission constraints.
3. **Slice C — Local-first:** SQLCipher horizon, outbox, rebuild preserving user state.
4. **Slice D — Rule/upcoming UX:** create preview, list/detail, skip/pause/edit states.
5. **Slice E — Matching:** candidate query/ranking, confirm/unmatch, header lifecycle/clearing propagation.
6. **Slice F — Notifications:** local/server scheduling, privacy defaults, dedupe/snooze.
7. **Slice G — Hardening:** worker, parity, accessibility, performance, security/analytics tests.

## Rollout dan kill-switch

- Flags: `recurring_v1`, `recurring_matching_v1`, `recurring_push_v1`, `recurring_variable_estimate_v1`.
- Internal recurrence parity → beta upcoming 10% → 50% → 100%; matching lalu push diluncurkan terpisah.
- Guardrail: duplicate occurrence/match, recurrence parity mismatch, reminder duplicate/failure, worker lag, crash-free sessions.
- Kill-switch push membatalkan schedule baru; local in-app list tetap aktif. Kill-switch matching mengubah occurrence ke manual review tanpa menghapus match existing.
- Materializer dapat dihentikan dan local horizon tetap bekerja; derived future occurrences dapat dibangun ulang.
- Schema additive; rules, version history, skip, dan match tidak dihapus saat rollback.
