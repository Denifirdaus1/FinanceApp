# F10 — Reports: Cashflow & Net Worth

## Metadata

- **Status:** Siap implementasi
- **Fase:** Phase 3
- **Prioritas:** P0
- **Platform:** Expo React Native iOS/Android
- **Dependensi wajib:** akun, transaksi/split, kategori, kurs snapshot, Supabase RLS, SQLCipher, F09 Dashboard untuk deep link

## Outcome dan JTBD

**Outcome:** pengguna dapat menjelaskan dari mana uang datang, ke mana uang pergi, dan bagaimana aset bersih berubah dalam rentang waktu terpilih dengan hasil yang konsisten terhadap ledger.

**JTBD:** “Ketika mengevaluasi keuangan, saya ingin memfilter, membandingkan, dan menelusuri angka cashflow serta net worth supaya saya dapat mengambil keputusan pribadi berdasarkan data saya sendiri.”

Laporan adalah deskripsi data historis/proyeksi berlabel, bukan nasihat finansial, pajak, investasi, atau kredit.

## Scope

- Cashflow: total income, expense, net cashflow, tren waktu, kategori, merchant/payee, dan akun.
- Net worth: total aset, total liabilitas, perubahan periode, breakdown akun, dan chart historis.
- Preset rentang: minggu ini, bulan ini, bulan lalu, tahun berjalan, 12 bulan, dan custom.
- Perbandingan dengan periode sebelumnya yang panjangnya sama.
- Filter akun, kategori, tag, `entry_type`, `lifecycle_status`, `clearing_status`, mata uang, dan include/exclude refund.
- Drill-down dari setiap angka/chart point ke daftar transaksi penyusunnya.
- Penyimpanan report preset pribadi.
- Export CSV lokal dengan explicit confirmation, privacy warning, dan share sheet OS.
- Offline report untuk data yang sudah tersinkron.

## Non-scope

- Pelaporan pajak resmi, laporan akuntansi double-entry tersertifikasi, konsolidasi badan usaha.
- Prediksi pasar, saran investasi, benchmark pengguna lain, atau “financial score”.
- Kurs live atau restatement otomatis ketika kurs baru tersedia.
- Export PDF tidak termasuk rilis awal fitur ini.
- Berbagi laporan melalui link publik/server.

## Kontrak data lintas fitur

- Setiap nilai uang persisted memakai `*_amount_minor bigint` bersama `currency_code` ISO-4217; `numeric` hanya untuk FX rate dan persentase. Konversi report memakai `fx_rate_snapshot_id` immutable dan menghasilkan integer minor unit pada currency report.
- Ledger kanonis memakai tepat satu header `financial_entries` dan line `entry_splits`; report tidak pernah menjumlah nominal header dan line secara bersamaan.
- Header memakai `entry_type=income|expense|transfer|balance_adjustment|refund|reversal`, `lifecycle_status=draft|posted|void`, dan `clearing_status=pending|cleared|reconciled`.
- `entry_splits.line_type` wajib `'account'|'category'`. Pada line account, `amount_minor` sendiri adalah signed balance delta (negatif/positif); line category memakai `amount_minor > 0` untuk reporting. `line_role` hanya label semantik dan tidak pernah menentukan tanda/dampak saldo. Invariant per currency divalidasi oleh ledger.
- Transfer internal dikecualikan dari consolidated cashflow tetapi line akun bertandanya tetap mengubah saldo. Fee transfer opsional wajib menjadi entry `expense` terpisah, bukan disamarkan sebagai line transfer.
- Rentang report adalah half-open `[start_date 00:00, end_date + 1 hari 00:00)` pada timezone IANA report.
- Ledger memakai `occurred_at timestamptz` sebagai instant kanonis dan `business_date date` yang dibekukan saat entry dibuat. User dapat menjalankan report dengan timezone lain; boundary dikonversi ke UTC dan grouping memakai `occurred_at`, tanpa menulis ulang `business_date` historis.
- Row finance/report memakai `household_id`, `created_by`, `updated_by`, `version`, dan tombstone `deleted_at`. Hanya preset pribadi yang boleh memiliki `user_id` sebagai preferensi user-scoped.
- RPC tetap `SECURITY INVOKER`; helper izin eksak adalah `private.can_access_account(p_household_id,p_account_id,p_action)` dengan `p_action in ('read','write','manage')`. Setiap account/entry yang dibaca wajib lolos membership household dan aksi `read`; cache perangkat terenkripsi SQLCipher.

## UX flow

1. Pengguna membuka Reports dan memilih tab **Cashflow** atau **Net Worth**.
2. Default Cashflow adalah bulan berjalan; default Net Worth adalah 12 bulan sampai hari ini.
3. Cache lokal merender summary dan chart; sinkronisasi memperbarui data tanpa mereset filter.
4. Filter sheet menampilkan chip aktif dan jumlah filter. Apply bersifat atomik; Cancel tidak mengubah report.
5. Tap segment/chart point membuka breakdown lalu transaksi dengan filter identik.
6. Compare menampilkan periode pembanding eksplisit, bukan hanya persentase.
7. Export memperlihatkan preview kolom, rentang, jumlah baris, dan peringatan bahwa file tidak terenkripsi setelah dibagikan.
8. Preset dapat diberi nama, diubah, dan dihapus; nama hanya tersimpan sebagai data privat.

## Functional requirements

- **F10-FR-001:** Semua summary, chart, breakdown, dan drill-down memakai satu `report_definition_hash`, `subject_user_id`, dan `access_scope_version` agar angka serta izin konsisten.
- **F10-FR-002:** Cashflow memisahkan earned income, gross expense, refund, net expense, dan net cashflow.
- **F10-FR-003:** Entry `posted` dengan `clearing_status=pending` tidak masuk actual; toggle menambahkan seri/kolom `committed` terpisah.
- **F10-FR-004:** Transfer internal tidak masuk consolidated cashflow. Pada filter satu akun, transfer tampil sebagai `account movement`, bukan income/expense.
- **F10-FR-005:** Net worth dihitung per akhir hari dan memisahkan assets/liabilities.
- **F10-FR-006:** Chart adaptif: harian ≤45 hari, mingguan 46–180 hari, bulanan >180 hari; pengguna dapat memilih granularitas valid.
- **F10-FR-007:** Periode pembanding memiliki durasi hari kalender sama dan berakhir satu hari sebelum periode utama dimulai.
- **F10-FR-008:** Drill-down mengembalikan stable pagination berdasarkan `(occurred_at desc, id desc)`.
- **F10-FR-009:** Missing FX tidak dianggap nol; setiap aggregate membawa count dan nilai native yang belum terkonversi.
- **F10-FR-010:** Saved preset menyimpan definisi filter, bukan hasil/nominal.
- **F10-FR-011:** CSV dibuat on-device dari data yang telah diotorisasi dan dihapus dari temp storage setelah share sheet ditutup atau maksimum 24 jam.
- **F10-FR-012:** Report dapat dibuka offline dengan indikator `as_of` dan coverage tanggal.
- **F10-FR-013:** Chart dan tabel dapat digunakan screen reader; insight warna selalu memiliki label teks/simbol.
- **F10-FR-014:** Setiap hasil menyertakan definisi angka yang dapat dibuka dari ikon info.

## Aturan cashflow exact

- Actual hanya membaca entry dengan `lifecycle_status=posted` dan `clearing_status in (cleared,reconciled)`; setiap category line dikonversi dari pasangan `amount_minor + currency_code` ke integer minor unit currency report.
- `gross_income = Σ converted(category_line.amount_minor)` untuk category line positif pada header `entry_type=income` yang actual-eligible dalam rentang.
- `gross_expense = Σ converted(category_line.amount_minor)` untuk category line positif pada header `entry_type=expense` yang actual-eligible dalam rentang.
- `refunds = Σ converted(category_line.amount_minor)` untuk header `entry_type=refund` actual-eligible dengan `related_entry_id` valid; alokasi mengikuti category line entry terkait.
- `net_expense = max(0, gross_expense - refunds_applied_in_range)` untuk headline; bila refund melebihi expense, surplus refund ditampilkan terpisah dan `net_expense=0`.
- `net_cashflow = gross_income + all_other_non_refund_income + refunds - gross_expense`; refund tidak dihitung dua kali sebagai earned income.
- Breakdown kategori hanya membaca category line positif pada `entry_splits`; tanpa category line masuk `Uncategorized` sesuai invariant ledger. Account line tidak pernah dijumlah sebagai kategori.
- Header `entry_type=transfer` dikecualikan dari consolidated income/expense/net cashflow. Jika report difilter ke subset akun dan hanya satu account line berada dalam subset, tampilkan pada section `account_movement`; headline tetap mengecualikannya. Fee hanya masuk bila ada entry `expense` terpisah.
- Header `entry_type=balance_adjustment` tidak masuk cashflow. Header `entry_type=reversal` membalik bucket milik `reversal_of_entry_id` tanpa membuat income/expense baru.
- Entry `posted` dengan `clearing_status=pending` hanya menghasilkan `committed_income`, `committed_expense`, dan `projected_cashflow`; tidak mengubah actual.
- `lifecycle_status in (draft,void)` selalu dikecualikan.
- Grouping periode menggunakan timezone report; minggu dimulai Senin untuk locale Indonesia, dapat diubah di Settings.

## Aturan net worth exact

- Saldo akun pada instant `t`: `opening_balance_minor + Σ account_line.amount_minor` untuk `line_type='account'` pada header `lifecycle_status=posted`, `clearing_status in (cleared,reconciled)`, dan `occurred_at <= t`; `amount_minor` negatif/positif adalah signed delta, sedangkan `line_role` tidak menentukan dampaknya. Semua `entry_type`, termasuk transfer, adjustment, refund, dan reversal, mengikuti delta line akun tersebut.
- Asset balance bertanda positif. Liability outstanding disimpan positif lalu dikurangkan: `net_worth = Σ asset_base - Σ liability_base`.
- Credit-card/loan payment internal tidak menjadi expense untuk bagian principal; interest/fee hanya menjadi expense bila dicatat sebagai entry `expense` terpisah yang actual-eligible.
- Akun archived tetap masuk snapshot historis dan current net worth selama saldo tidak nol; akun excluded dengan `include_in_net_worth=false` tidak masuk.
- Line akun pada entry `posted` dengan `clearing_status=pending` tidak mengubah actual net worth; toggle projected menampilkan overlay `actual + signed pending account lines` tanpa menulis snapshot.
- Titik harian memakai end-of-day `23:59:59.999…` lokal. Titik mingguan/bulanan adalah titik harian terakhir dalam bucket.
- `absolute_change = ending_net_worth - starting_net_worth`.
- `percent_change = absolute_change / abs(starting_net_worth) × 100`; jika starting nol, persentase bernilai `null`.
- FX conversion memakai snapshot saldo/transaction yang berlaku pada tanggal titik. Missing FX membuat total titik `partial`; komponen native tetap tersedia.
- Pembulatan setiap komponen hanya sekali ke base minor unit dengan half-away-from-zero; total menjumlah integer hasil konversi.

## Entitas dan fields

### `report_presets`

- `id uuid pk`, `household_id uuid`, `user_id uuid` (preferensi pribadi; satu-satunya direct user scope)
- `name text` (1–60 karakter setelah trim)
- `report_type text check (cashflow|net_worth)`
- `definition jsonb` tervalidasi schema versioned: range kind, account/category/tag IDs, `entry_type`, `lifecycle_status`, `clearing_status`, currency, comparison, granularity
- `schema_version smallint`, `is_default boolean`
- `created_at`, `created_by`, `updated_at`, `updated_by`, `version`, `deleted_at`
- Unique partial `(household_id, user_id, lower(name), report_type)` where `deleted_at is null`.

### `account_balance_snapshots`

- `id uuid pk`, `household_id uuid`, `subject_user_id uuid`, `access_scope_version bigint`, `account_id uuid`
- `snapshot_date date`, `timezone text`, `currency_code char(3)`, `closing_balance_minor bigint`
- `report_currency_code char(3) null`, `report_closing_balance_minor bigint null`, `fx_rate_snapshot_id uuid null`
- `ledger_source_version bigint`, `computed_at timestamptz`, `created_by`, `updated_by`, `version`, `deleted_at`
- Unique `(household_id, subject_user_id, access_scope_version, account_id, snapshot_date, report_currency_code)`; derived/disposable cache, bukan ledger atau sumber kebenaran.
- Snapshot hanya boleh dibentuk untuk akun yang saat compute lolos `private.can_access_account(household_id,account_id,'read')`; pergantian permission membuat scope version baru dan cache lama tidak boleh dibaca.

### `report_export_audit`

- Tidak dibuat di server pada rilis awal fitur ini untuk menghindari metadata sensitif. On-device menyimpan hanya `exported_at`, `report_type`, dan `row_count_bucket` selama 7 hari bila analytics opt-in.

## Service, query, dan RPC

- `ReportDefinition` di shared package menghasilkan canonical JSON + SHA-256 `report_definition_hash`.
- `CashflowCalculator.calculate(ledger, definition)` dan `NetWorthCalculator.calculate(...)` adalah pure functions yang dipakai local repository dan fixture server.
- `rpc_cashflow_report(p_definition jsonb, p_cursor text default null)` mengembalikan summary, series, breakdown, coverage, missing FX, `ledger_source_version`, `access_scope_version`, dan cursor untuk subject saat ini.
- `rpc_net_worth_report(p_definition jsonb)` mengembalikan assets/liabilities, series, source/access-scope version, dan partial markers setelah restricted accounts dikeluarkan.
- `rpc_report_financial_entries(p_definition_hash text, p_dimension jsonb, p_cursor text)` memvalidasi ulang canonical definition, household, serta izin setiap account/entry; hash bukan authorization token.
- `rpc_upsert_report_preset(p_payload jsonb,p_expected_version bigint,p_mutation_id uuid)` melakukan optimistic concurrency; `p_expected_version` nullable hanya untuk create dan `p_mutation_id` menjadi idempotency key wajib.
- Indeks utama: `financial_entries (household_id,lifecycle_status,clearing_status,occurred_at,id)`, `entry_splits (household_id,line_type,category_id,account_id,financial_entry_id)`, dan snapshots `(household_id,subject_user_id,access_scope_version,snapshot_date,account_id)`.

## Offline dan sinkronisasi

- Kalkulator lokal menghasilkan report dari ledger SQLCipher dan memberi `coverage_start/end` berdasarkan data tersinkron.
- Saved preset memakai outbox idempotent; server menolak ID filter di luar household atau account yang tidak dapat diakses subject user.
- Delta ledger atau FX meng-invalidasi bucket terkait mulai `business_date`; snapshot berikutnya dibangun ulang deterministik.
- Server response menggantikan cache hanya jika `ledger_source_version >= local_ledger_source_version`, `subject_user_id`, `access_scope_version`, dan definition hash semuanya sama.
- Perubahan membership/account permission menaikkan access-scope version, membatalkan report/snapshot lama, dan menghapus data restricted dari cache lokal sebelum UI berikutnya dirender.
- Konflik preset tidak auto-overwrite: pertahankan versi server dan buat local copy bernama “(salinan)” bila kedua sisi mengubah definition.
- Export offline diizinkan bila UI menyebut coverage/as-of; file temp dienkripsi saat dibuat dan didekripsi hanya untuk share target OS.

## Keamanan dan privasi

- RLS seluruh tabel memverifikasi membership `household_id`; setiap FK/query ke account atau financial entry memanggil `private.can_access_account(household_id,account_id,'read')` untuk seluruh `line_type='account'` terkait. Mutasi memakai aksi `write` atau `manage` sesuai operasi. `subject_user_id` dan cache key bukan pengganti authorization.
- FK composite/trigger memastikan seluruh preset, snapshot, entry, split, category, dan account berada dalam household yang sama; RPC berjalan `SECURITY INVOKER` dan menghasilkan generic not-found untuk resource terlarang.
- Karena `report_presets` murni preferensi pribadi, policy-nya boleh menambahkan `auth.uid() = user_id`; tidak ada row finance atau aggregate yang memakai equality user sebagai satu-satunya authorization.
- Tidak ada service key, raw SQL, atau arbitrary column selection dari klien; JSON definition divalidasi allowlist server.
- Batasi custom range maksimum 10 tahun per request dan pagination maksimum 500 transaksi untuk mencegah abuse.
- Nama preset, merchant, note, nominal, kategori custom, dan file export tidak masuk log/analytics.
- CSV menerapkan formula-injection protection: sel yang diawali `=`, `+`, `-`, atau `@` diberi apostrof; encoding UTF-8 BOM opsional untuk spreadsheet lokal.
- File temp memakai app-private directory, filename generik, OS data-protection, auto-delete ≤24 jam.

## States dan errors

- **Loading/cache:** render cache plus shimmer hanya pada bucket yang belum ada.
- **No data:** tampilkan definisi rentang dan CTA tambah transaksi, bukan chart nol menyesatkan.
- **Partial FX:** aggregate valid tampil, missing currencies didaftarkan tanpa nominal sensitif di log.
- **Coverage gap:** arsiran chart dan pesan rentang yang belum tersinkron.
- **Invalid filter/preset lama:** migrasikan schema; bila mustahil, buka default dan tawarkan hapus preset rusak.
- **Too large:** arahkan persempit rentang/export per bagian; jangan crash.
- **Unauthorized:** generic not found.
- **Export/share failure:** file temp langsung dihapus dan user dapat retry.

## Analytics yang aman privasi

- Events: `report_viewed`, `report_filter_applied`, `report_drilldown_opened`, `report_preset_saved`, `report_export_started`, `report_export_result`.
- Allowlist: `report_type`, `range_kind`, `range_days_bucket`, `granularity`, `filter_count_bucket`, `has_comparison`, `is_offline`, `result`, `row_count_bucket`, `duration_bucket`.
- Dilarang: definition JSON, tanggal exact custom, amount, currency totals, merchant/category/tag/name, account/resource IDs, CSV filename/content.
- Analytics non-esensial mengikuti opt-out dan retensi maksimal yang ditetapkan kebijakan global.

## Acceptance criteria (Given–When–Then)

1. **Given** income 1.000.000, expense 400.000, refund 50.000, dan transfer 200.000 semuanya `lifecycle_status=posted` serta `clearing_status=cleared`, **When** report dibuat, **Then** gross income 1.000.000, net expense 350.000, net cashflow 650.000, dan transfer tidak masuk headline.
2. **Given** expense 100.000 berstatus `posted` + `clearing_status=pending`, **When** toggle committed mati/nyala, **Then** actual tetap sama dan hanya seri committed yang berubah.
3. **Given** starting net worth nol, **When** ending menjadi 500.000, **Then** change absolut 500.000 dan percent change null.
4. **Given** filter hanya akun A dan transfer A→B, **When** cashflow dibuka, **Then** transfer muncul sebagai account movement tetapi tidak sebagai expense.
5. **Given** satu komponen tanpa FX, **When** aggregate tampil, **Then** titik ditandai partial dan tidak menganggap komponen bernilai nol.
6. **Given** anggota B memanggil RPC dengan account ID private anggota A yang gagal `private.can_access_account(household_id,account_id,'read')`, **When** request diproses, **Then** hasil kosong/forbidden tanpa metadata account maupun aggregate.
7. **Given** transaksi diubah offline, **When** report lokal dihitung, **Then** summary, chart, dan drill-down memakai ledger source version, subject user, dan access-scope version yang sama.
8. **Given** note dimulai `=HYPERLINK(...)`, **When** CSV dibuat, **Then** sel dinetralkan dan tidak dieksekusi sebagai formula.

## Test matrix

| Area | Kasus minimum | Level |
|---|---|---|
| Cashflow | refund/reversal lintas periode, category line positif, transfer subset akun, pending clearing, lifecycle void | Unit/property |
| Net worth | asset/liability, archived/excluded, principal-interest split, zero baseline | Unit/property |
| Waktu | DST, month-end, leap year, locale week start, custom timezone | Unit |
| Currency | zero/three decimals, missing FX, negative balances, rounding aggregate | Unit/property |
| Konsistensi | summary vs chart vs drill-down vs server fixture | Contract/integration |
| Offline/sync | partial coverage, delta invalidation, preset conflict, stale ledger/access-scope response | Integration |
| Security | cross-household, private/revoked account, linked-entry RLS, malformed definition, range limit, CSV injection | SQL/security |
| UX/a11y | chart narration, dynamic type, color independence, large dataset | Component/E2E |
| Performance | 100k financial entries, 10-year monthly series, 500-row paging | Benchmark |

## Implementation slices dan dependensi

1. **Slice A — Domain math:** canonical definition, money/date utilities, cashflow/net-worth calculators, golden fixtures. Dependensi F01 account dan F02 transaction contract.
2. **Slice B — Local engine:** SQLCipher indices, reactive aggregation, coverage, ledger/access-scope versions, dan snapshot invalidation.
3. **Slice C — Supabase:** snapshot table, RPCs, definition validation, RLS/abuse limits, parity contract tests.
4. **Slice D — Cashflow UI:** summary, series, breakdown, filter, comparison, drill-down.
5. **Slice E — Net worth UI:** asset/liability breakdown, historical chart, partial FX semantics.
6. **Slice F — Presets/export:** optimistic sync, schema migration, safe CSV/share cleanup.
7. **Slice G — Hardening:** accessibility, performance, analytics allowlist, offline and security E2E.

## Rollout dan kill-switch

- Flags: `reports_cashflow_v1`, `reports_networth_v1`, `reports_export_v1`; default off per production migration.
- Tahap: internal parity fixtures → beta read-only 10% → 50% → 100%; export menyusul setelah security test.
- Shadow parity membandingkan local/server hash dan bucket mismatch tanpa mengirim nominal/filter.
- Guardrail: RPC p95, timeout/error rate, partial-FX rate, local/server mismatch, export failure, crash-free sessions.
- Kill-switch report server mengalihkan ke local-only dengan label coverage; kill-switch export menyembunyikan tombol dan menghapus temp file saat launch berikutnya.
- Schema rollout additive; snapshot dapat dibuang/dibangun ulang, sementara ledger dan preset tidak dihapus.
