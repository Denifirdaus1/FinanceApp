# F11 — Budgets

## Metadata

- **Status:** Siap implementasi
- **Fase:** Phase 2–3
- **Prioritas:** P0
- **Platform:** Expo React Native iOS/Android
- **Dependensi wajib:** kategori dan split transaksi, akun, kurs snapshot, Supabase RLS, SQLCipher, F09 Dashboard; F13 Recurring untuk committed forecast bersifat opsional

## Outcome dan JTBD

**Outcome:** pengguna dapat merencanakan batas pengeluaran, melihat actual dan committed spending secara jujur, serta memahami sisa budget tanpa mengubah ledger transaksi.

**JTBD:** “Ketika merencanakan pengeluaran, saya ingin memberi batas per kategori dan melihat apakah pengeluaran saya masih sesuai rencana supaya saya dapat menyesuaikan perilaku sendiri.”

Budget adalah alat perencanaan pribadi, bukan nasihat finansial atau jaminan bahwa dana tersedia di rekening.

## Scope

- Budget per kategori atau kelompok kategori.
- Siklus mingguan, bulanan, dan custom berulang; timezone dan hari awal eksplisit.
- Alokasi per budget line, adjustment antar-line, dan catatan opsional.
- Rollover: none, positive-only, full balance, atau positive capped.
- Actual, committed dari `clearing_status=pending`, forecast recurring, available, dan overspent dipisahkan.
- Progress list, detail per period, riwayat period, dan drill-down transaksi.
- Alert lokal/push ketika mencapai 80%, 100%, atau nilai custom.
- Copy budget sebelumnya dan pause/archive tanpa menghapus riwayat.
- Offline create/edit/track dan sinkronisasi konflik aman.

## Non-scope

- Memblokir transaksi/kartu, memindahkan uang nyata, atau auto-debit.
- Optimasi otomatis atau rekomendasi jumlah budget berbasis profil pengguna.
- Kolaborasi edit serentak dan approval multi-user tidak termasuk rilis awal; data tetap tenant-scoped dengan `household_id` agar isolasi dan izin akun konsisten.
- Zero-based cash envelope lintas rekening yang menjamin saldo bank.
- Kurs live dan restatement budget historis.

## Kontrak data lintas fitur

- Setiap nilai uang persisted memakai `*_amount_minor bigint` bersama `currency_code` ISO-4217; `numeric` hanya untuk FX rate dan persentase.
- Ledger kanonis memakai tepat satu header `financial_entries` dan line `entry_splits`; budget tidak pernah menjumlah nominal header dan line secara bersamaan.
- Header memakai `entry_type=income|expense|transfer|balance_adjustment|refund|reversal`, `lifecycle_status=draft|posted|void`, dan `clearing_status=pending|cleared|reconciled`.
- `entry_splits.line_type` wajib `'account'|'category'`. Pada line account, `amount_minor` sendiri adalah signed balance delta (negatif/positif); category line memakai `amount_minor > 0` sebagai sumber atribusi budget. `line_role` hanya label semantik dan tidak pernah menentukan tanda/dampak saldo. Tanpa category line masuk `Uncategorized` hanya bila line budget eksplisit mencakupnya.
- Header `transfer` selalu dikecualikan dari spending, committed, dan forecast; fee transfer hanya eligible bila dicatat sebagai entry `expense` terpisah.
- Ledger memakai `occurred_at timestamptz` sebagai instant kanonis dan `business_date date` yang dibekukan saat entry dibuat; period boundary menggunakan timezone IANA budget.
- Entitas planning memakai `household_id`, `created_by`, `updated_by`, audit timestamps, `version`, dan tombstone `deleted_at`.
- Supabase RLS memverifikasi membership household; helper izin eksak adalah `private.can_access_account(p_household_id,p_account_id,p_action)` dengan `p_action in ('read','write','manage')`. Setiap aggregate/drill-down wajib memeriksa seluruh account line dengan aksi `read`.

## UX flow

1. User membuka Budgets dan melihat period aktif, total planned, actual, committed, forecast, dan daftar line.
2. “Buat budget” meminta nama, currency, cadence, tanggal mulai, rollover, lalu kategori dan alokasi.
3. Preview selalu menunjukkan tanggal period pertama serta simulasi rollover dengan contoh angka pengguna sendiri.
4. Detail line menampilkan formula sisa dan transaksi penyusun; pending dan recurring forecast memiliki section tersendiri.
5. User dapat memindahkan alokasi antar-line dalam period yang sama. Ini membuat adjustment berpasangan dan tidak memengaruhi saldo akun.
6. Edit aturan berlaku mulai period aktif atau period berikutnya; perubahan historis memerlukan konfirmasi dan memicu recompute berantai.
7. Saat offline, perubahan langsung terlihat dan diberi status menunggu sinkronisasi.
8. Alert membawa deep link ke line/period terkait dan tidak menampilkan nominal pada lock screen secara default.

## Functional requirements

- **F11-FR-001:** Buat budget dengan minimal satu line dan satu period valid.
- **F11-FR-002:** Satu kategori hanya boleh aktif pada satu line dalam budget yang sama/period overlap; kategori dapat ada pada budget berbeda.
- **F11-FR-003:** Hitung planned, actual, committed, forecast, available, dan overspend memakai formula deterministik.
- **F11-FR-004:** Entry `posted` dengan `clearing_status=pending` tidak mengurangi actual; tampil sebagai committed dan dapat diikutkan dalam “available after committed”.
- **F11-FR-005:** Transfer tidak pernah dianggap spending, termasuk transfer ke rekening tujuan eksternal yang masih diklasifikasikan internal oleh user.
- **F11-FR-006:** Refund tertaut mengurangi actual pada kategori/split original; refund tanpa tautan tidak otomatis mengurangi budget.
- **F11-FR-007:** Rollover ditutup deterministik dan dapat direcompute setelah backdated edit.
- **F11-FR-008:** Adjustment antar-line wajib zero-sum dalam currency budget dan tersimpan sebagai satu group atomik.
- **F11-FR-009:** Missing FX ditampilkan sebagai transaksi belum terhitung; tidak dianggap nol.
- **F11-FR-010:** Alert threshold dikirim maksimal sekali per threshold per line/period/calculation version dan access-scope version.
- **F11-FR-011:** Pause mencegah pembuatan period baru tetapi tidak mengubah period historis/aktif.
- **F11-FR-012:** Archive menyembunyikan budget dari default list; data dan drill-down tetap tersedia.
- **F11-FR-013:** Drill-down mempertahankan period, line, lifecycle/clearing status, ledger source version, subject user, dan access-scope version yang sama dengan angka summary.
- **F11-FR-014:** Perubahan offline memakai optimistic concurrency dan tidak silently overwrite versi server.

## Definisi period

- **Weekly:** `[start_date, start_date + 7 hari)`; `week_start` default Senin, dapat dipilih.
- **Monthly:** anchor day 1–28. Period dimulai anchor day pada bulan N dan berakhir sebelum anchor day bulan N+1.
- **Custom recurring:** panjang 1–366 hari, dihitung dari `anchor_date`; rule kalender arbitrer tidak termasuk rilis awal fitur ini.
- Tanggal akhir UI bersifat inklusif, tetapi query memakai batas akhir eksklusif.
- Perubahan timezone hanya berlaku pada period yang belum dibuat; period historis menyimpan `timezone` sendiri.
- Period dibuat maksimal 3 ke depan dan idempotent dengan unique `(budget_id,start_date,end_date)`.

## Aturan perhitungan exact

Untuk line `L` pada period `P`:

- `base_allocation = budget_line_periods.allocated_amount_minor`; row ini adalah input planning versioned, bukan hasil agregasi ledger.
- `net_adjustment = Σ adjustment_in - Σ adjustment_out` yang `status=applied`.
- `rollover_in` ditentukan dari final available period sebelumnya.
- `planned = base_allocation + net_adjustment + rollover_in`.
- Eligible ledger set hanya header `lifecycle_status=posted` yang seluruh account line-nya dapat diakses subject user; category line harus positif dan dikonversi dari `amount_minor + currency_code` ke integer minor unit currency budget.
- `actual_spent = Σ expense category lines - Σ refund category allocations dengan related_entry_id - Σ reversal allocations dengan reversal_of_entry_id` untuk `clearing_status in (cleared,reconciled)` dalam boundary period.
- `committed = Σ expense category lines - Σ refund/reversal allocations bertaut canonical` untuk `clearing_status=pending`.
- `forecast = Σ unmatched recurring expense occurrence` dalam sisa period; occurrence yang sudah matched ke entry `posted` ber-`clearing_status=pending|cleared|reconciled` tidak dihitung lagi.
- `available_actual = planned - actual_spent`.
- `available_after_committed = planned - actual_spent - committed`.
- Forecast tidak mengubah available; UI opsional menampilkan `projected_remaining = planned - actual_spent - committed - forecast`.
- `overspent = max(0, -available_actual)`.
- `usage_percent = actual_spent / planned × 100` jika `planned > 0`; jika planned ≤0, percent `null` dan status adalah `overspent` bila actual_spent > planned.

### Rollover

Saat period `P` ditutup, `closing_available = planned - actual_spent` (pending/forecast tidak ikut):

- `none`: next `rollover_in = 0`.
- `positive_only`: `max(closing_available, 0)`.
- `full_balance`: `closing_available`, termasuk negatif.
- `positive_capped`: `min(max(closing_available,0), rollover_cap_minor)`.

Period otomatis `provisional_closed` saat boundary lewat. Setelah grace 7 hari tanpa perubahan backdated, status `closed`. Backdated entry actual-eligible, refund/reversal, atau edit membuka kembali period terdampak, menghitung ulang seluruh rantai rollover hingga period aktif, dan menaikkan `calculation_version`. Perubahan access-scope juga recompute hasil per subject user. Notifikasi threshold tidak dikirim ulang untuk version yang nilainya tidak melintasi threshold dari bawah.

### Currency dan eligibility

- Setiap budget memiliki satu `currency_code`.
- Category line dengan currency sama memakai native `amount_minor`. Currency berbeda memakai immutable `budget_amount_minor bigint` + currency budget dari `fx_rate_snapshot_id` pada `occurred_at`.
- Missing FX dikecualikan dari angka dan menambah `missing_fx_count`; setelah rate tersedia, recompute memperbarui period.
- Header `lifecycle_status in (draft,void)`, `entry_type=income|transfer|balance_adjustment`, dan principal debt payment dikecualikan; refund/reversal hanya mengurangi bucket original yang tertaut.
- Expense negatif tidak diizinkan; koreksi memakai refund/adjustment tertaut.

## Entitas dan fields

### `budgets`

- `id uuid pk`, `household_id uuid`, `name text` (1–60), `currency_code char(3)`
- `cadence text check (weekly|monthly|custom_days)`, `anchor_date date`, `anchor_day smallint null`, `interval_days smallint null`
- `timezone text`, `rollover_mode text`, `rollover_cap_minor bigint null`
- `status text check (active|paused|archived)`
- `effective_edit_policy text check (current|next)`
- `created_at`, `created_by`, `updated_at`, `updated_by`, `version`, `deleted_at`

### `budget_lines`

- `id uuid pk`, `household_id uuid`, `budget_id uuid`, `name text`, `sort_order integer`
- `default_allocation_amount_minor bigint >= 0`, `currency_code char(3)` yang wajib sama dengan budget
- `alert_thresholds smallint[] default '{80,100}'` (1–1000, unique/sorted)
- `is_active boolean`, `created_by`, `updated_by`, audit/version/tombstone fields

### `budget_line_categories`

- `household_id`, `budget_line_id`, `category_id`, `effective_from date`, `effective_to date null`
- `created_by`, `updated_by`, audit/version/tombstone fields
- Composite uniqueness mencegah overlap kategori dalam satu budget.

### `budget_periods`

- `id uuid pk`, `household_id`, `budget_id`, `start_date`, `end_date_exclusive`, `timezone`
- `status open|provisional_closed|closed`, `created_by`, `updated_by`, audit/version/tombstone fields
- Unique `(budget_id,start_date,end_date_exclusive)`.

### `budget_line_periods`

- `household_id`, `period_id`, `line_id`
- `allocated_amount_minor bigint`, `currency_code char(3)` yang wajib sama dengan budget
- `created_by`, `updated_by`, audit/version/tombstone fields
- Hanya allocation yang menjadi input/source of truth; actual, committed, forecast, rollover, dan available tidak disimpan sebagai fakta pada row ini.

### `budget_line_period_summaries`

- `household_id`, `subject_user_id`, `access_scope_version bigint`, `period_id`, `line_id`
- `currency_code char(3)`, `rollover_in_amount_minor bigint`, `actual_amount_minor bigint`, `committed_amount_minor bigint`, `forecast_amount_minor bigint`
- `missing_fx_count integer`, `ledger_source_version bigint`, `calculation_version bigint`, `computed_at timestamptz`
- `created_by`, `updated_by`, `version`, `deleted_at` untuk audit/tombstone cache
- Unique `(household_id,subject_user_id,access_scope_version,period_id,line_id,calculation_version)`; derived/disposable cache, selalu dapat dibangun ulang dari input planning + ledger terotorisasi dan bukan source of truth.

### `budget_adjustments`

- `id uuid`, `household_id`, `period_id`, `group_id uuid`
- `from_line_id`, `to_line_id`, `amount_minor bigint > 0`, `currency_code char(3)`, `status applied|reversed`
- `note_ciphertext text null`, `idempotency_key uuid`, `created_by`, `updated_by`, audit/version/tombstone fields

## Service, query, dan RPC

- `BudgetCalculator.computePeriod(input)` pure/deterministic dan dipakai golden parity tests.
- `BudgetRepository.observeActive(localDate)` membaca SQLCipher secara reaktif.
- `rpc_create_budget(p_payload jsonb,p_idempotency_key uuid)` memvalidasi cadence, household/category consistency, dan overlap; idempotency key wajib untuk create.
- `rpc_get_budget_period(p_budget_id uuid,p_period_id uuid)` mengembalikan lines, totals, missing FX, `ledger_source_version`, `subject_user_id`, dan `access_scope_version`; restricted account entries dikeluarkan sebelum agregasi.
- `rpc_move_budget_allocation(p_period_id uuid,p_from_line uuid,p_to_line uuid,p_amount_minor bigint,p_expected_version bigint,p_idempotency_key uuid)` atomik dan zero-sum; key dan expected version wajib.
- `rpc_recompute_budget_chain(p_budget_id uuid,p_from_date date,p_subject_user_id uuid,p_access_scope_version bigint,p_expected_version bigint,p_mutation_id uuid)` adalah server-internal queue dengan advisory lock per budget/scope dan output cache disposable; mutation ID wajib/idempotent.
- `rpc_close_budget_periods(p_through_date date,p_expected_version bigint,p_mutation_id uuid)` berjalan idempotent sebagai `SECURITY INVOKER`/scheduled worker terkontrol; mutation ID dan expected version wajib.
- Indeks: `financial_entries (household_id,lifecycle_status,clearing_status,occurred_at,id)`, `entry_splits (household_id,line_type,category_id,account_id,financial_entry_id)`, periods `(household_id,budget_id,start_date)`, summaries `(household_id,subject_user_id,access_scope_version,period_id,line_id)`.

## Offline dan sinkronisasi

- Semua input dan derived aggregate period aktif tersimpan di SQLCipher; aggregate diberi subject/access-scope version dan tetap diperlakukan sebagai cache, sehingga UI dapat berfungsi tanpa jaringan tanpa menjadikannya source of truth.
- Create/edit/adjustment masuk outbox dengan UUID/idempotency key. Adjustment pair ditulis dalam satu transaksi lokal.
- Server cursor + record `version` menentukan merge. Timestamp perangkat tidak menentukan pemenang.
- Perubahan struktural bersamaan pada budget yang sama memicu conflict copy untuk diedit user; transaksi baru tetap dapat diagregasi.
- Setelah delta transaksi diterapkan, local recompute dimulai dari period paling awal yang terdampak dan berlanjut hingga active period.
- Server aggregate diterima hanya jika `ledger_source_version` tidak lebih lama daripada ledger lokal serta `subject_user_id` dan `access_scope_version` sama.
- Perubahan membership/account permission menaikkan access-scope version, membatalkan summary lama, dan menghapus kontribusi entry/account restricted dari cache lokal sebelum UI berikutnya dirender.
- Tombstone disimpan hingga seluruh device cursor mengakui atau minimum 30 hari.

## Keamanan dan privasi

- RLS pada seluruh tabel memeriksa membership `household_id`; RPC memvalidasi household budget, line, category, period, dan adjustment secara eksplisit.
- Setiap query/RPC yang menautkan financial entry wajib memeriksa semua `line_type='account'` melalui `private.can_access_account(household_id,account_id,'read')`; satu account terlarang mengecualikan entry tersebut dari aggregate dan drill-down tanpa bocor metadata. Mutasi memakai aksi `write` atau `manage` sesuai operasi.
- Constraint/FK composite/trigger household consistency mencegah referensi silang household. `created_by`/`updated_by` adalah audit actor, bukan dasar authorization.
- Derived summary selalu terikat `subject_user_id + access_scope_version`; RLS dan service tidak boleh memakai identitas cache itu sebagai pengganti pemeriksaan izin live.
- SQLCipher key di SecureStore; note sensitif dienkripsi aplikasi bila disinkronkan.
- Push default: “Budget perlu ditinjau”; nominal dan nama kategori hanya jika user opt-in pada preview unlocked.
- Analytics/log tidak memuat nominal, nama budget/category, note, transaction ID, atau threshold custom exact.
- Tidak ada klaim bahwa budget menjamin saldo rekening atau merupakan rekomendasi profesional.

## States dan errors

- **Empty:** contoh struktur lokal tidak disimpan sampai user menyetujui.
- **No eligible entries:** planned tampil, actual nol, penjelasan eligibility tersedia.
- **Overspent:** nilai sisa negatif dan label netral; tidak memakai red-only cue.
- **Partial FX:** item/count terpisah dan CTA isi rate manual bila fitur tersedia.
- **Recomputing:** tampilkan last valid result dengan badge; jangan campur calculation versions.
- **Conflict:** server version dipertahankan, perubahan lokal disimpan sebagai salinan terulas.
- **Invalid period/category overlap:** blok save dengan pesan field-level.
- **Offline alert:** local notification dapat dikirim; server dedupe saat reconnect.

## Analytics yang aman privasi

- Events: `budget_created`, `budget_period_viewed`, `budget_filter_changed`, `budget_adjustment_saved`, `budget_threshold_crossed`, `budget_conflict_shown`.
- Allowlist: `cadence`, `rollover_mode`, `line_count_bucket`, `threshold_bucket`, `status`, `is_offline`, `result`, `calculation_duration_bucket`.
- Dilarang: amounts, currency totals, category/budget names, notes, custom dates, account/transaction/resource IDs.
- Threshold event menyimpan jenis `below_80|80_99|100_plus`, bukan persentase atau nilai exact.

## Acceptance criteria (Given–When–Then)

1. **Given** planned 1.000.000, expense 600.000 berstatus `posted` + `clearing_status=cleared`, expense 100.000 berstatus `posted` + `clearing_status=pending`, dan forecast unmatched 50.000, **When** period dibuka, **Then** available actual 400.000, after committed 300.000, projected remaining 250.000.
2. **Given** transfer internal 500.000 pada kategori mana pun, **When** budget dihitung, **Then** actual/committed/forecast tidak berubah.
3. **Given** closing available -100.000 dan rollover `full_balance`, **When** period berikut dibuat, **Then** rollover_in -100.000; untuk `positive_only` nilainya nol.
4. **Given** entry `refund` 50.000 berstatus `posted` + `clearing_status=cleared` tertaut ke category line expense original, **When** report direcompute, **Then** actual line berkurang 50.000 tanpa menambah income budget.
5. **Given** transaksi asing tanpa FX, **When** detail dibuka, **Then** transaksi terdaftar sebagai belum terhitung dan `missing_fx_count` bertambah.
6. **Given** edit backdated pada period dua bulan lalu, **When** sync selesai, **Then** rollover tiap period setelahnya direcompute berurutan dengan satu calculation version, ledger source version, dan access-scope version konsisten.
7. **Given** dua device mengubah struktur line dari version sama, **When** sync, **Then** satu versi server dan satu conflict copy tersedia; tidak ada silent loss.
8. **Given** anggota B memakai line dari household lain atau entry akun private anggota A yang gagal `private.can_access_account(household_id,account_id,'read')`, **When** RPC adjustment/report dieksekusi, **Then** ditolak/tidak diagregasi dan tidak ada perubahan balance maupun kebocoran metadata.

## Test matrix

| Area | Kasus minimum | Level |
|---|---|---|
| Formula | all rollover modes, zero/negative planned, refund, adjustments | Unit/property |
| Eligibility | category/account line, uncategorized, transfer, debt principal, lifecycle draft/void, seluruh clearing status | Unit |
| Period | weekly/monthly/custom, anchor, leap day, DST/timezone edit | Unit |
| FX | same currency, zero/three-decimal, missing rate, rounding | Unit/property |
| Recompute | backdated create/edit/delete, rollover chain, notification dedupe | Integration |
| Offline | create/edit/move, outbox retry, stale ledger/access-scope aggregate, permission purge, conflict copy | Integration/E2E |
| RLS | cross-household category/line/period, private/revoked account, linked-entry access, unauthenticated RPC | SQL/security |
| UX/a11y | dynamic type, screen reader formula, color-independent status | Component/E2E |
| Performance | 100 lines, 100k splits, 36-period chain | Benchmark |

## Implementation slices dan dependensi

1. **Slice A — Domain:** period generator, eligibility, rollover/formula, money/FX fixtures.
2. **Slice B — Schema/RLS:** budget inputs, periods/aggregates, overlap constraints, SQL tests.
3. **Slice C — Local-first:** SQLCipher views, recompute chain, outbox, reactive list/detail.
4. **Slice D — CRUD UX:** wizard, period/list/detail, formula explanations, drill-down.
5. **Slice E — Adjustments & alerts:** atomic move, threshold dedupe, privacy-safe notifications.
6. **Slice F — Server compute:** RPCs/jobs, parity/shadow checks, conflict copy handling.
7. **Slice G — Hardening:** accessibility, load/offline/security tests, analytics allowlist.

## Rollout dan kill-switch

- Flags: `budgets_v1`, `budget_rollover_v1`, `budget_alerts_v1`; default off hingga migrasi/fixtures lulus.
- Internal → beta 10% → 50% → 100%; rollover dan alerts dapat diluncurkan terpisah.
- Guardrail: local/server calculation mismatch, recompute latency, conflict rate, duplicate alert, crash-free sessions.
- Shadow calculation hanya mengirim boolean mismatch, formula version, dan bucket; tidak mengirim amount/category.
- Kill-switch alerts membatalkan scheduling baru; kill-switch rollover membekukan last valid aggregate dan menampilkan status maintenance, tanpa mengubah input/ledger.
- Rollback bersifat additive; derived period rows dapat dibangun ulang, budget input tidak pernah dihapus otomatis.
