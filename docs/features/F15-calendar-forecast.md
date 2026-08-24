# F15 — Calendar & Forecast

## Metadata

- **Status:** Siap implementasi
- **Fase:** Phase 3
- **Prioritas:** P1
- **Platform:** Expo React Native iOS/Android
- **Dependensi wajib:** `accounts`, `financial_entries`, `entry_splits`, F13 recurring, F11 budgets, F12 goals, F14 debt, kurs snapshot, Supabase RLS, SQLCipher

## Outcome dan JTBD

**Outcome:** pengguna dapat melihat kejadian finansial historis dan mendatang pada satu kalender serta memahami proyeksi saldo deterministik beserta sumber/asumsinya.

**JTBD:** “Ketika merencanakan beberapa minggu ke depan, saya ingin melihat pemasukan, pengeluaran, tagihan, goal, dan jatuh tempo dalam urutan tanggal serta dampak estimasinya pada saldo.”

Forecast adalah simulasi berdasarkan data dan asumsi pengguna; hasilnya bukan prediksi pasti dan bukan nasihat finansial.

## Scope

- Month calendar dan agenda harian/mingguan.
- Event: entry actual (`posted` + `cleared|reconciled`), entry projected (`posted` + `pending`), recurring occurrence, budget period boundary, goal deadline/planned contribution, debt due, dan reminder.
- Filter account, `entry_type`, `lifecycle_status`, `clearing_status`, currency, category, dan date range.
- Deterministic balance forecast per account dan consolidated base currency.
- Horizon 7/30/90/365 hari; custom maksimal 366 hari.
- Scenario pribadi dengan inclusion toggle serta override tanggal/amount per projected event.
- Actual vs projected styling, detail provenance, missing-FX marker, dan low-balance threshold user-defined.
- Drag/reschedule hanya untuk occurrence/override yang diizinkan, tidak untuk entry actual (`posted` + `cleared|reconciled`).
- Offline calendar/forecast berdasarkan coverage lokal.

## Non-scope

- AI prediction, market forecasting, investment return, inflasi, atau rekomendasi tindakan.
- Auto-pay/move money dan perubahan jadwal lender/biller.
- Kalender eksternal Google/Apple sync tidak termasuk rilis awal fitur ini.
- Holiday banking calendar; weekend behavior berasal dari rule F13.
- Budget allocation sebagai arus kas. Budget hanya boundary/status event.
- Shared multi-user planning tidak termasuk rilis awal fitur ini.

## Kontrak lintas fitur

- Semua uang persisten memakai `amount_minor bigint` + `currency_code`; `numeric` hanya untuk FX/percentage. Base aggregation memakai FX snapshot eksplisit.
- Ledger kanonis memakai satu header `financial_entries` dan `entry_splits`: `line_type='account'` memakai `amount_minor` negatif/positif, sedangkan `line_type='category'` memakai `amount_minor > 0`; `line_role` hanya semantic role dan calendar tidak membuat ledger kedua.
- Header memakai `entry_type=income|expense|transfer|balance_adjustment|refund|reversal`, `lifecycle_status=draft|posted|void`, dan `clearing_status=pending|cleared|reconciled`.
- Actual hanya entry `posted` dengan clearing `cleared|reconciled`; entry `posted+pending` dan recurring adalah projected/committed. Draft/void dikecualikan.
- Recurring occurrence yang matched ke entry `posted` ber-clearing pending/cleared/reconciled tidak boleh dihitung lagi.
- Goal “required contribution” hanyalah informasi dan tidak menjadi forecast event; hanya planned contribution eksplisit/recurring yang dihitung.
- Debt due tidak menjadi cashflow forecast bila sudah direpresentasikan recurring payment/transaction agar tidak ganda.
- Ledger event memakai `occurred_at` + immutable `business_date`; event non-ledger boleh memiliki tanggal lokal domainnya. Data finance/planning memakai household audit/version/tombstone serta helper `private.can_access_account(p_household_id,p_account_id,p_action)` dengan action `read|write|manage`.

## UX flow

1. User membuka Calendar pada bulan lokal sekarang. Dot/ikon menunjukkan event type tanpa mengungkap nominal saat privacy mode.
2. Tap tanggal membuka agenda terurut: actual, pending, projected, dan informational boundaries dipisah.
3. Switch **Forecast** membuka chart saldo dan asumsi aktif. Default horizon 30 hari, semua spendable accounts, base scenario.
4. Tap titik chart menunjukkan starting balance, item yang diterapkan, ending balance, missing data, dan formula.
5. User membuat scenario, memilih sumber yang disertakan, lalu override occurrence date/amount. Base data tidak berubah.
6. Drag occurrence meminta konfirmasi “hanya skenario / ubah recurring rule”; default hanya scenario override.
7. Low-balance marker memakai threshold yang ditetapkan user dan copy netral.
8. Saat offline, coverage dan `as_of` tampil; scenario tetap dapat diedit dan masuk outbox.

## Functional requirements

- **F15-FR-001:** Kalender menggabungkan event melalui stable `event_key`, tanpa duplikasi antara occurrence dan matched transaction.
- **F15-FR-002:** Entry `posted` dengan clearing `cleared|reconciled` tampil actual; clearing `pending`/recurring/planned tampil projected dengan legenda non-color.
- **F15-FR-003:** Forecast memakai starting balance dan event application rules exact di bawah.
- **F15-FR-004:** Consolidated transfer net zero bila kedua leg ada dalam account selection; tetap terlihat per akun.
- **F15-FR-005:** Entry `clearing_status=pending` tidak masuk starting actual; diterapkan pada expected date sebagai projected.
- **F15-FR-006:** Overdue occurrence terlihat tetapi tidak otomatis diaplikasikan ke forecast sampai expected date diatur atau user mengaktifkan “anggap hari ini”.
- **F15-FR-007:** Budget boundary dan goal deadline tidak mengubah saldo.
- **F15-FR-008:** Debt payment tidak double-count dengan recurring/transaction; source priority diterapkan.
- **F15-FR-009:** Missing FX membuat consolidated point partial, sementara native per-account forecast tetap tersedia.
- **F15-FR-010:** Scenario override tidak memodifikasi transaction, rule, goal, debt, atau base occurrence.
- **F15-FR-011:** Entry actual tidak dapat di-drag; edit dilakukan lewat transaction flow dengan audit/reversal.
- **F15-FR-012:** Forecast mengungkap `as_of`, source coverage, inclusion settings, dan formula version.
- **F15-FR-013:** Low-balance alert dedupe per account/scenario/date/source-version.
- **F15-FR-014:** Horizon/filters bertahan per-device/user preference tanpa menyimpan nominal di analytics.

## Model event dan source priority

`event_key = source_type + ':' + source_id + ':' + source_version_or_occurrence_sequence`.

Jika beberapa sumber merepresentasikan kewajiban yang sama, gunakan hanya prioritas tertinggi:

1. Cleared transaction (actual).
2. Entry `posted` dengan `clearing_status=pending` yang matched ke occurrence/debt plan.
3. Recurring occurrence unmatched.
4. Explicit scenario event/goal planned contribution.
5. Debt schedule due yang belum memiliki recurring/transaction link.
6. Informational goal/budget boundary (amount tidak diaplikasikan).

Source dengan prioritas lebih rendah tetap dapat ditampilkan sebagai linkage metadata tetapi `applied_amount=0` dan `suppressed_by_event_key` diisi.

## Aturan calendar exact

- Month grid mengikuti timezone/user locale; default first day Senin untuk Indonesia dan dapat dikonfigurasi.
- Query range half-open dari first visible grid date 00:00 hingga sehari setelah last visible grid date 00:00.
- Entry ledger dikelompokkan memakai stored `business_date` dan diurutkan intra-day dengan `occurred_at`; event date-based non-ledger memakai tanggal lokal domainnya.
- Perubahan timezone user tidak menulis ulang source local date; display lintas timezone menunjukkan badge bila tanggal bergeser.
- Agenda sort: due time bila ada, lalu source priority, lalu `created_at`, lalu `event_key`.
- Header `lifecycle_status=void` dan source event cancelled disembunyikan default tetapi tersedia lewat filter history.

## Aturan forecast exact

### Starting point

- `as_of` adalah server time terakhir atau device time saat offline, disimpan bersama timezone.
- `starting_balance(account) = opening_balance_minor + Σ entry_splits.amount_minor` untuk `line_type='account'` dari header `posted`, clearing `cleared|reconciled`, dan `occurred_at <= as_of`.
- Tanda selalu dibaca dari account line, bukan diinferensikan dari `entry_type`; transfer membawa line masuk `+` dan keluar `-`.
- Header `draft|void` dikecualikan.

### Applying projected events

- Forecast day range adalah `[today_local_date, horizon_end_local_date]` inklusif untuk UI dan event.
- Entry `posted` dengan `clearing_status=pending` memakai `expected_local_date`; bila null, gunakan `max(today,business_date)`. User override scenario dapat mengubah tanggal proyeksi tanpa mengubah ledger.
- Recurring unmatched memakai adjusted `due_local_date` dan native estimate F13.
- Overdue occurrence tidak diaplikasikan secara default. Dengan `include_overdue_as_today=true`, semuanya diterapkan pada today dan disajikan sebagai group overdue terpisah.
- Goal contribution hanya diterapkan bila ada explicit planned contribution event; required-periodic suggestion tidak.
- Debt due diterapkan sebagai total payment hanya jika tidak linked/suppressed oleh recurring atau transaction.
- Budget allocation/remaining/overspend tidak pernah diaplikasikan ke balance.
- Untuk tiap account/day: `ending = prior_ending + Σ projected_signed_amount hari itu`; integer-only.
- Entry yang menjadi actual setelah forecast cache `as_of` menggantikan projected match pada recompute.

### Transfers dan consolidation

- Per-account forecast selalu menerapkan leg masing-masing.
- Consolidated selected accounts: jika source/destination keduanya selected, transfer sum nol. Jika hanya satu selected, leg diterapkan dan dilabeli `account movement`, bukan income/expense.
- Fee transfer hanya diterapkan bila ada entry `expense` terpisah yang tertaut; category line fee tidak menjadi bagian header transfer.

### Currency, low balance, dan scenario

- Native account curve selalu authoritative.
- Consolidated base memakai forecast FX snapshot yang tersedia untuk event date; snapshot menyimpan source/as-of. Missing rate membuat point `partial` dan event tidak dianggap nol.
- Conversion round half-away-from-zero sekali per event leg ke base minor unit.
- `low_balance` tercapai bila ending native < user `threshold_minor`; untuk consolidated hanya jika point complete.
- Scenario total adalah base sources plus overrides. Delete override mengembalikan base event; exclude source mengubah applied amount nol hanya dalam scenario.

## Entitas dan fields

### `calendar_preferences`

- `user_id uuid`, `household_id uuid`, `week_start smallint default 1`, `default_view month|agenda|forecast`; unique active `(user_id,household_id)`
- `default_horizon_days smallint`, `visible_event_types text[]`, `privacy_mode boolean`
- `created_by`, `updated_by`, `created_at`, `updated_at`, `version`, `deleted_at`; user-only preference boleh RLS `auth.uid()=user_id` tetapi tidak memberi akses sumber event.

### `forecast_scenarios`

- `id uuid pk`, `household_id`, `created_by`, `updated_by`, `visibility private|household`, `name text` (1–60), `base_currency_code char(3)`
- `account_ids uuid[]`, `horizon_days smallint 1..366`
- `include_pending`, `include_recurring`, `include_goal_plans`, `include_debt_schedule`, `include_overdue_as_today` booleans
- `is_default boolean`, `formula_version smallint`, audit/version/tombstone fields; setiap account wajib lolos helper exact dengan action `read` saat baca dan `write` saat mutasi

### `forecast_overrides`

- `id uuid`, `household_id`, `created_by`, `updated_by`, `scenario_id`, `source_event_key text null`
- `kind modify|exclude|custom`, `custom_entry_type income|expense|transfer null`
- `local_date date`, `amount_minor bigint null`, `currency_code char(3) null`
- `account_id`, `destination_account_id null`, `note_ciphertext null`
- `idempotency_key`, audit/version/tombstone fields

### `forecast_cache`

- `household_id`, `subject_user_id`, `account_scope_hash`, `permission_version`, `scenario_id`, `local_date`, `account_id null`
- `opening_minor bigint`, `projected_delta_minor bigint`, `closing_minor bigint`
- `currency_code char(3)`, `base_closing_minor bigint null`, `base_currency_code char(3)`, `missing_fx_count`
- `as_of`, `source_version`, `formula_version`, audit/version/tombstone fields; derived and rebuildable, bukan financial source of truth.
- Cache hanya memuat account/source yang dapat diakses `subject_user_id`; permission revocation meng-invalidasi hash/version dan RLS menolak row lama.

Calendar events dibuat sebagai read model dari source tables, bukan source-of-truth table baru.

## Service, query, dan RPC

- `CalendarEventAssembler.build(sources,range)` dan `ForecastEngine.calculate(input)` pure dengan golden fixtures.
- `CalendarRepository.observeRange(range,filters)` dan `ForecastRepository.observeScenario(id)` membaca SQLCipher.
- `rpc_get_calendar_events(p_start,p_end,p_filters,p_cursor)` returns versioned unified event DTO.
- `rpc_get_forecast(p_scenario_id,p_as_of,p_horizon_end)` returns curves, source events, suppressed links, coverage, missing FX.
- `rpc_upsert_forecast_scenario(p_payload,p_expected_version,p_idempotency_key)` memvalidasi household dan helper account action `write` untuk seluruh IDs.
- `rpc_upsert_forecast_override(p_payload,p_expected_version,p_idempotency_key)` tidak boleh mengubah source actual dan memvalidasi semua linked accounts.
- `rpc_rebuild_forecast_cache(p_scenario_id,p_from_business_date,p_expected_source_version,p_mutation_id)` adalah server job idempotent/advisory lock.
- Indeks: `financial_entries (household_id,lifecycle_status,clearing_status,occurred_at)` dan `(household_id,business_date)`, `entry_splits (household_id,account_id,financial_entry_id)`, permissions, occurrence due, debt due, goal date, dan overrides scenario/date.

## Offline dan sinkronisasi

- Event sources, scenarios, overrides, dan forecast cache tersimpan SQLCipher.
- Local engine menghasilkan calendar/forecast penuh selama source coverage tersedia.
- Scenario/override masuk outbox idempotent; server menolak source beda household, restricted account, atau stale tanpa mengubah base event.
- Delta source meng-invalidasi cache dari min(affected date,today) sampai horizon; recompute debounced.
- Server cache dipakai hanya bila source version ≥ local, formula version cocok, dan `permission_version/account_scope_hash` sama dengan akses user saat ini.
- Conflict scenario: merge non-overlapping overrides per stable ID; conflicting same override menghasilkan local conflict copy.
- Coverage gap dan stale FX selalu ditampilkan; offline time tidak digunakan untuk mengubah source status server secara permanen.

## Keamanan dan privasi

- RLS scenario/override/cache memakai household membership dan `private.can_access_account(p_household_id,p_account_id,p_action)` (`read|write|manage`) pada seluruh account/source tertaut; preference user-only tetap memerlukan membership.
- Forecast RPC memulai dari accessible accounts dan tidak boleh mengembalikan aggregate, event count, low-balance flag, atau cache yang mengungkap restricted account.
- SQLCipher key di SecureStore; scenario notes terenkripsi sebelum sync.
- Server menerima allowlisted filters, horizon ≤366, page limits, dan tidak mengeksekusi arbitrary query JSON.
- Analytics/log tidak memuat amounts, dates exact, names, notes, event/account/source IDs, low-balance values.
- Push low-balance generik default dan opt-in; deep link melewati auth/biometric/RLS.
- Forecast selalu berlabel estimate/as-of dan tidak menggunakan copy preskriptif.

## States dan errors

- **Empty:** tampilkan event actual bila ada dan CTA recurring; forecast menjelaskan data yang dibutuhkan.
- **Cached/offline:** coverage/as-of banner tanpa memblokir.
- **Partial FX/coverage:** native curves tetap tampil; consolidated diberi gap/partial, bukan garis nol.
- **No projected events:** garis saldo datar berlabel asumsi, bukan “saldo pasti”.
- **Low balance:** marker netral dengan detail source; bukan alarm finansial preskriptif.
- **Suppressed duplicate:** hanya satu applied event; detail menunjukkan linkage.
- **Source deleted/changed:** override orphaned masuk review dan tidak diaplikasikan.
- **Conflict/recomputing:** last coherent formula/source version tetap tampil.
- **Unauthorized:** generic not found.

## Analytics yang aman privasi

- Events: `calendar_viewed`, `calendar_filter_applied`, `forecast_viewed`, `forecast_scenario_saved`, `forecast_override_saved`, `forecast_partial_shown`.
- Allowlist: `view_type`, `horizon_bucket`, `event_type_count`, `source_toggle_count`, `has_partial`, `has_low_balance_boolean`, `is_offline`, `result`, `duration_bucket`.
- Dilarang: amount/balance/threshold, exact date, scenario/event names, notes, currency totals, account/source IDs.

## Acceptance criteria (Given–When–Then)

1. **Given** starting balance 1.000.000, recurring expense 200.000 dan entry income `posted+pending` 500.000 pada besok, **When** forecast besok dihitung, **Then** ending 1.300.000 dan keduanya berlabel projected.
2. **Given** recurring occurrence matched ke entry `clearing_status=pending`, **When** event dirakit, **Then** hanya entry tersebut diaplikasikan dan occurrence menunjuk `suppressed_by`.
3. **Given** transfer 300.000 A→B dan kedua akun dipilih, **When** consolidated forecast dihitung, **Then** delta transfer nol; curves A/B masing-masing -/+300.000.
4. **Given** hanya akun A dipilih, **When** transfer yang sama dihitung, **Then** selected total -300.000 sebagai account movement, bukan expense.
5. **Given** overdue occurrence dan default setting, **When** forecast dibuka, **Then** occurrence terlihat di agenda tetapi tidak menurunkan saldo sampai expected date/include-overdue dipilih.
6. **Given** goal required-periodic tanpa planned event, **When** forecast dihitung, **Then** tidak ada pengurangan saldo.
7. **Given** missing FX, **When** consolidated chart dirender, **Then** point partial/gap dan native account curve tetap ada.
8. **Given** user B memasukkan source event dari account household yang tidak boleh ia akses, **When** RPC dipanggil, **Then** ditolak tanpa metadata atau perubahan aggregate.

## Test matrix

| Area | Kasus minimum | Level |
|---|---|---|
| Source priority | posted cleared/reconciled, posted pending, recurring/debt/goal duplicate links | Unit/property |
| Balance | signs, per-account/consolidated transfer, fees, pending | Unit |
| Dates | today/as-of, overdue, DST, timezone shift, leap/month boundary | Unit |
| Currency | native/base, missing/stale FX, zero/three decimals, rounding | Unit/property |
| Scenario | modify/exclude/custom/delete/orphan/conflict | Integration |
| Offline | partial coverage, delta invalidation, stale server cache/outbox | Integration/E2E |
| Security | non-member/restricted account, permission revocation/cache invalidation, malformed filter, RLS | SQL/security |
| UX/a11y | calendar/agenda/chart narration, privacy mode, non-color legend | Component/E2E |
| Performance | 10k events, 100 accounts, 366-day recompute | Benchmark |

## Implementation slices dan dependensi

1. **Slice A — Unified event contract:** source adapters, identity/priority/dedupe, date fixtures.
2. **Slice B — Forecast engine:** balance signs, transfers, source application, FX/partial semantics.
3. **Slice C — Schema/RLS:** preference/scenario/override/cache, household dan account-permission constraints.
4. **Slice D — Local-first:** SQLCipher calendar queries, reactive invalidation/recompute, outbox.
5. **Slice E — UX:** month/agenda, filters, forecast chart/detail/formula, privacy/a11y.
6. **Slice F — Scenario/alerts:** override editor, conflict/orphan review, generic low-balance alerts.
7. **Slice G — Server parity/hardening:** RPC/cache job, shadow compare, security/performance E2E.

## Rollout dan kill-switch

- Flags: `calendar_v1`, `forecast_v1`, `forecast_scenarios_v1`, `forecast_alerts_v1`.
- Calendar read-only internal → beta 25% → 100%; forecast internal parity → 10% → 50% → 100%; writes/alerts terpisah.
- Guardrail: duplicate applied event, local/server mismatch, stale cache, partial rate, alert duplicate, chart crash/performance.
- Shadow telemetry hanya formula/source version, boolean mismatch, count buckets; tanpa amount/event IDs.
- Kill-switch forecast menyembunyikan chart/scenario tetapi calendar actual/upcoming tetap aktif. Kill-switch alerts membatalkan schedule baru.
- Derived cache dapat dibuang/rebuild; scenarios/overrides/source records tidak dihapus saat rollback.
