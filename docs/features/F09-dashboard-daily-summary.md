# F09 — Dashboard & Ringkasan Harian

## Metadata

- **Status:** Siap implementasi
- **Fase:** Phase 2
- **Prioritas:** P0
- **Platform:** iOS dan Android melalui Expo/React Native
- **Dependensi wajib:** Auth Google, akun/dompet, transaksi, kategori, kurs tersimpan, Supabase, SQLite terenkripsi (SQLCipher), push notification opsional

## Outcome dan JTBD

**Outcome:** pengguna memahami kondisi keuangannya hari ini dalam kurang dari 10 detik dan dapat melanjutkan ke tindakan utama tanpa membuka banyak layar.

**JTBD:** “Ketika membuka aplikasi, saya ingin segera melihat uang yang tersedia, pemasukan/pengeluaran hari ini, komitmen terdekat, serta progres rencana supaya saya tahu apa yang perlu diperhatikan sekarang.”

Dashboard bersifat informasional, bukan nasihat keuangan, penilaian kelayakan kredit, atau rekomendasi investasi.

## Scope

- Header sapaan, tanggal lokal, pemilih household/workspace bila kelak tersedia, dan tombol sembunyikan nominal.
- Kartu **Saldo tersedia**, **Pemasukan hari ini**, **Pengeluaran hari ini**, dan **Arus kas bulan berjalan**.
- Ringkasan budget: terpakai, tersisa, dan kategori mendekati/melewati batas.
- Tagihan/langganan jatuh tempo 7 hari ke depan.
- Progres maksimal tiga goal aktif berdasarkan urutan pengguna atau tenggat terdekat.
- Tren net worth ringkas dibanding akhir bulan sebelumnya.
- Aktivitas terbaru dan transaksi yang perlu ditinjau.
- Quick actions: catat manual, scan struk, voice command, dan transfer.
- Pull-to-refresh, cache offline, skeleton loading, empty state, partial-error state.
- Preferensi susunan kartu, rentang privasi, serta opsi memasukkan transaksi pending pada kartu komitmen.

## Non-scope

- Rekomendasi investasi, skor kesehatan finansial normatif, atau saran alokasi dana otomatis.
- Perbankan/open-banking, pemindahan dana nyata, dan pembayaran tagihan.
- Tampilan agregat bersama seluruh anggota household tidak termasuk rilis awal; penyimpanan dan API tetap `household_id`-scoped serta selalu memfilter akun yang boleh dilihat user pemanggil.
- Kurs live. Agregasi hanya memakai snapshot kurs yang telah tersimpan.
- Widget home-screen OS tidak termasuk rilis awal fitur ini.

## Kontrak data dan aturan lintas fitur

- Nilai uang persisten disimpan sebagai integer minor unit (`amount_minor bigint`) beserta `currency_code` ISO-4217; `numeric` hanya untuk FX/percentage dan binary float dilarang untuk uang.
- Ledger kanonis memakai satu header `financial_entries` dan `entry_splits`: saldo berasal dari line `line_type='account'` dengan `amount_minor` bertanda negatif/positif, sedangkan reporting/category berasal dari `line_type='category'` dengan `amount_minor > 0`. `line_role` hanya semantic role seperti source/destination; header bukan sumber delta saldo.
- Header memakai `entry_type=income|expense|transfer|balance_adjustment|refund|reversal`, `lifecycle_status=draft|posted|void`, dan `clearing_status=pending|cleared|reconciled`.
- Actual dashboard hanya membaca entry `posted` dengan clearing `cleared|reconciled`; `pending` hanya committed/projected, sedangkan `draft|void` selalu dikecualikan.
- Transfer mempunyai minimal dua account line bertanda berlawanan dan selalu dikecualikan dari income/expense/cashflow. Fee transfer, bila ada, adalah entry `expense` terpisah yang ditautkan ke transfer.
- Ledger menyimpan instant `occurred_at` dan tanggal bisnis immutable `business_date` yang diturunkan dengan timezone IANA saat entry dibuat. Perubahan timezone tidak menulis ulang `business_date` historis.
- Rentang hari adalah `[00:00, 24:00)` pada zona waktu pengguna; rentang bulan `[hari pertama 00:00, hari pertama bulan berikutnya 00:00)`.
- Agregasi lintas mata uang memakai `base_amount_minor bigint`, `base_currency_code`, dan `fx_rate_snapshot_id` immutable saat entry menjadi actual. Bila snapshot tidak ada, entry tidak dijumlahkan ke kartu agregat dan UI menampilkan jumlah item yang belum dapat dikonversi.
- Data finansial dibatasi oleh `household_id`; RLS memerlukan membership aktif dan `private.can_access_account(p_household_id,p_account_id,'read')` untuk setiap account line sumber. Action helper hanya `read|write|manage`; service-role tidak pernah ada di aplikasi klien.
- Record mutable memiliki `id`, `household_id`, `created_by`, `updated_by`, `created_at`, `updated_at`, `version`, dan `deleted_at` sebagai tombstone. Preferensi UI yang benar-benar pribadi boleh memakai `user_id`, tetapi tidak memberi akses ke data finansial.

## UX flow

1. Setelah auth dan onboarding, aplikasi membuka Dashboard pada tanggal lokal hari ini.
2. Cache terenkripsi ditampilkan segera dengan label “Diperbarui …”; sinkronisasi berjalan di latar depan.
3. Pengguna dapat mengetuk nominal untuk membuka detail laporan, kartu budget untuk daftar budget, tagihan untuk kalender, atau goal untuk halaman goal.
4. Pengguna dapat menahan ikon mata untuk menyembunyikan semua angka selama sesi; preferensi permanen tersedia di Settings.
5. Quick action membuka alur terkait dan kembali ke Dashboard setelah sukses. Kartu yang terdampak diperbarui optimistis.
6. Jika server mengembalikan data lebih baru, angka dianimasikan ringan dan label sinkronisasi diperbarui tanpa mengubah posisi scroll.
7. Bila hanya satu sumber gagal, kartu lain tetap tampil dan kartu gagal menyediakan retry lokal.

## Functional requirements

- **F09-FR-001:** Tampilkan cache lokal dalam ≤1 detik pada perangkat kelas menengah setelah database terbuka.
- **F09-FR-002:** Hitung saldo tersedia per akun dan total base currency sesuai aturan di bawah.
- **F09-FR-003:** Tampilkan pemasukan/pengeluaran hari ini dan arus kas bulan berjalan dengan drill-down yang mempertahankan filter.
- **F09-FR-004:** Tampilkan budget aktif dengan indikator 80%, 100%, dan overspend tanpa bahasa menghakimi.
- **F09-FR-005:** Tampilkan occurrence tagihan yang jatuh tempo dalam tujuh `local_date` berikutnya, maksimum lima, lalu “Lihat semua”.
- **F09-FR-006:** Tampilkan maksimal tiga goal aktif; jangan tampilkan goal archived/completed kecuali dipilih pengguna.
- **F09-FR-007:** Tampilkan perubahan net worth absolut dan persentase terhadap snapshot akhir bulan sebelumnya.
- **F09-FR-008:** Aktivitas terbaru memuat 10 entry dengan `lifecycle_status != void` terbaru dan badge `clearing_status=pending` bila relevan.
- **F09-FR-009:** Privacy mode mengganti seluruh nominal, termasuk accessibility label, menjadi simbol netral; screenshot preview aplikasi juga diburamkan saat app background.
- **F09-FR-010:** Pengguna dapat mengurutkan, menyembunyikan, dan memulihkan kartu default.
- **F09-FR-011:** Refresh bersifat idempotent dan tidak membuat snapshot/kartu ganda.
- **F09-FR-012:** Setiap kartu menyatakan waktu pembaruan dan status `fresh`, `stale`, `offline`, atau `partial`.
- **F09-FR-013:** Tampilkan review badge untuk transaksi duplikat, pending terlalu lama, atau data hasil OCR/voice berkeyakinan rendah.
- **F09-FR-014:** Semua deep link memverifikasi membership household dan izin setiap akun tertaut sebelum membuka detail.

## Aturan perhitungan

### Saldo

- `ledger_balance(account) = opening_balance_minor + Σ entry_splits.amount_minor` untuk `line_type='account'` dari header `posted` dengan `clearing_status in (cleared,reconciled)` hingga akhir `business_date` hari ini.
- Tanda berasal dari account line, bukan inferensi `entry_type`: dana masuk `+amount_minor`, dana keluar `-amount_minor`; transfer membawa dua line bertanda berlawanan.
- `available_balance = ledger_balance + Σ pending account-line amount_minor` hanya untuk header `posted`, `clearing_status=pending`, dan akun dengan `include_pending_in_available = true`; default `true` untuk rekening transaksi dan `false` untuk cash/manual account.
- Total lintas akun mengecualikan akun `archived` tetapi memasukkan saldo historis akun archived pada net worth. Dashboard saldo tersedia hanya memasukkan akun `is_spendable = true`.

### Ringkasan arus kas

- `income_today = Σ base_amount_minor` category line positif dari entry `entry_type=income`, `lifecycle_status=posted`, `clearing_status in (cleared,reconciled)`, dan `business_date=today`.
- `expense_today = Σ base_amount_minor` category line positif dari entry `entry_type=expense` dengan lifecycle/clearing actual pada hari ini.
- `cashflow_mtd = income_actual_mtd + refund_actual_mtd - expense_actual_mtd`; refund tetap disajikan terpisah dari earned income.
- Transfer internal selalu dikecualikan dari income, expense, budget spending, dan cashflow; kedua leg tetap memengaruhi saldo akun.
- Refund ditulis sebagai `entry_type=refund` dengan `related_entry_id` menunjuk expense asli dan category line positif ke kategori asli; ia mengurangi net spending tetapi tidak dihitung sebagai earned income. Reversal memakai `reversal_of_entry_id`.
- Header dengan `clearing_status=pending` tidak masuk actual income/expense/cashflow. Jika preferensi `show_committed` aktif, pending expense tampil sebagai `committed` terpisah.

### Budget, tagihan, goal, dan net worth

- Budget usage memakai category line expense `posted` + `cleared|reconciled` dalam periodenya, dikurangi refund tertaut; `clearing_status=pending` ditampilkan sebagai committed terpisah.
- Tagihan due memakai recurring occurrence berstatus `forecast` atau `due`, bukan transaksi aktual yang sudah matched/paid.
- Goal progress memakai alokasi dari entry actual dikurangi withdrawal actual; alokasi dari entry `clearing_status=pending` tampil terpisah.
- `net_worth = Σ asset_balance_base - Σ liability_balance_base` pada akhir `local_date`.
- Perubahan persentase: `(current - previous) / abs(previous) × 100`; jika `previous = 0`, tampilkan nilai absolut tanpa persentase.
- Pembulatan konversi memakai half-away-from-zero ke minor unit; angka sumber tidak diubah.

## Entitas dan fields

### `dashboard_preferences`

- `user_id uuid fk auth.users`, `household_id uuid`; unique active `(user_id,household_id)`
- `card_order text[] not null`
- `hidden_cards text[] not null default '{}'`
- `privacy_mode boolean not null default false`
- `show_committed boolean not null default true`
- `goal_ids uuid[] null`
- `created_by`, `updated_by`, `created_at`, `updated_at`, `version bigint`, `deleted_at` tombstone
- Ini preferensi user-only; RLS boleh mewajibkan `auth.uid()=user_id`, tetapi setiap `goal_id`/filter tetap divalidasi terhadap household dan account access saat dibaca.

### `daily_financial_snapshots`

- `id uuid pk`, `household_id uuid`, `subject_user_id uuid`, `account_scope_hash text`, `permission_version bigint`
- `local_date date`, `timezone text`, `base_currency_code char(3)`
- `spendable_balance_minor bigint`
- `income_cleared_minor bigint`, `expense_cleared_minor bigint`
- `pending_income_minor bigint`, `pending_expense_minor bigint`
- `net_worth_minor bigint null`
- `missing_fx_count integer not null default 0`
- `source_version bigint`, `computed_at timestamptz`, `created_by`, `updated_by`, `version`, `deleted_at`
- Unique `(household_id,subject_user_id,account_scope_hash,local_date,base_currency_code)`; snapshot adalah derived cache, bukan source of truth, dan hanya berisi sumber yang lolos izin akun subject user.
- Perubahan/revocation `account_permissions` menaikkan `permission_version`, meng-invalidasi snapshot, dan RLS tetap menolak cache lama sehingga aggregate restricted account tidak bocor.

Dashboard juga membaca `accounts`, `financial_entries`, `entry_splits`, `budgets`, `budget_periods`, `recurring_occurrences`, `goals`, dan `review_items` sesuai kontrak masing-masing.

## Service, query, dan RPC

- `DashboardRepository.observeLocal(date): Observable<DailyDashboard>` — query SQLCipher reaktif.
- `DashboardService.refresh(date, signal)` — pull delta, recompute lokal, lalu revalidate server.
- `rpc_get_daily_dashboard(p_local_date date, p_timezone text, p_base_currency text, p_show_committed boolean)` — mengembalikan satu payload versioned; `SECURITY INVOKER`.
- `rpc_rebuild_daily_snapshot(p_business_date date,p_expected_source_version bigint,p_mutation_id uuid)` — state-changing job idempotent untuk `subject_user_id=auth.uid()` dan scope akun yang masih dapat diakses.
- Query server memakai indeks `financial_entries (household_id,lifecycle_status,clearing_status,business_date,id)`, `entry_splits (household_id,account_id,financial_entry_id)`, dan `account_permissions (household_id,user_id,account_id)`.
- Response membawa `as_of`, `source_version`, `missing_fx_count`, dan daftar `partial_errors`; tidak menyertakan OCR mentah atau transkrip voice.

## Offline dan sinkronisasi

- Dashboard sepenuhnya dapat dibaca dari SQLCipher setelah satu sinkronisasi berhasil.
- Mutasi dari quick action ditulis ke outbox dengan UUID client dan `idempotency_key`, lalu aggregate lokal diperbarui dalam satu transaksi database.
- Pull delta berdasarkan server cursor monotonik; merge menggunakan `version`, bukan timestamp perangkat.
- Snapshot lokal selalu dapat dibangun ulang dari ledger lokal. Server snapshot menang hanya jika `source_version` lebih tinggi dan semua delta hingga cursor telah diterapkan.
- Konflik preferensi menggunakan last-server-version dengan merge per-field; urutan kartu memakai seluruh array dari mutasi terakhir yang valid.
- Saat offline, tampilkan `as_of` dan jangan mengklaim data terkini. Missing FX tetap dipisahkan.

## Keamanan dan privasi

- RLS preferensi user-only memeriksa `user_id=auth.uid()` + membership household. Snapshot hanya dapat dibaca subject user yang sama, tidak boleh ditulis klien, dan setiap sumber wajib lolos `private.can_access_account(p_household_id,p_account_id,'read')`.
- RPC dashboard memulai dari daftar akun accessible, lalu mengagregasi entry hanya jika seluruh account line relevan dapat diakses; ID asing/restricted menghasilkan forbidden tanpa metadata, bukan aggregate parsial diam-diam.
- Cache SQLCipher menggunakan key dari SecureStore/Keychain/Keystore, bukan AsyncStorage.
- App switcher blur aktif; log, crash report, analytics, dan notification preview tidak boleh memuat nominal, nama merchant, catatan, OCR, atau transkrip.
- Deep link hanya membawa route dan opaque ID; server/RLS memvalidasi akses.
- Export atau share tidak tersedia dari Dashboard.
- Session timeout dan biometric lock mengikuti kebijakan aplikasi global.

## States dan error handling

- **First load:** skeleton tanpa angka palsu.
- **Empty:** ajakan tambah transaksi/akun pertama; kartu budget/goal tidak dipaksakan.
- **Offline cached:** data tampil dengan banner non-blocking dan waktu pembaruan.
- **Partial:** kartu gagal menunjukkan pesan singkat serta retry; kartu valid tetap aktif.
- **Missing FX:** total terhitung ditampilkan bersama warning jumlah transaksi, bukan dianggap nol.
- **Sync conflict:** tampilkan nilai lokal sampai merge selesai; tidak membuat toast berulang.
- **Unauthorized/session expired:** kunci tampilan, hapus decrypted view state dari memori, arahkan login.
- **Corrupt local cache:** isolasi DB, minta login ulang/sync; jangan menghapus outbox sebelum recovery/export terenkripsi berhasil.

## Analytics yang aman privasi

- Events: `dashboard_viewed`, `dashboard_card_opened`, `dashboard_refresh_result`, `dashboard_privacy_toggled`, `dashboard_quick_action_selected`.
- Properties allowlist: `card_type`, `source=cache|network`, `freshness_bucket`, `result`, `duration_bucket`, `is_offline`, `missing_fx_bucket`.
- Dilarang: amount, currency balance, merchant, category bebas, account name, note, OCR, transcript, goal name, transaction/resource ID.
- User identifier analytics berupa pseudonymous installation/user key yang dapat dirotasi; opt-out mematikan event non-esensial.

## Acceptance criteria (Given–When–Then)

1. **Given** entry expense `posted+cleared` Rp50.000 hari ini dan transfer internal Rp200.000, **When** Dashboard dibuka, **Then** pengeluaran hari ini Rp50.000 dan transfer tidak menambah income/expense.
2. **Given** expense `posted` dengan `clearing_status=pending` Rp75.000 serta `show_committed=true`, **When** ringkasan tampil, **Then** actual tidak berubah dan Rp75.000 tampil sebagai committed.
3. **Given** perangkat offline dengan cache sinkron terakhir, **When** aplikasi dibuka, **Then** semua kartu yang dapat dihitung tampil dengan label waktu cache dalam ≤1 detik setelah unlock DB.
4. **Given** satu transaksi mata uang asing tanpa FX snapshot, **When** total base currency dihitung, **Then** transaksi tidak dianggap nol dan warning `missing_fx_count=1` terlihat.
5. **Given** privacy mode aktif, **When** user melihat Dashboard atau app switcher, **Then** tidak ada nominal pada UI, accessibility label, atau preview.
6. **Given** previous net worth nol, **When** perbandingan dihitung, **Then** hanya perubahan absolut ditampilkan dan tidak ada `Infinity/NaN`.
7. **Given** deep link ke entry household pada akun yang tidak boleh diakses user, **When** dibuka, **Then** akses ditolak tanpa membocorkan metadata resource atau aggregate akun.
8. **Given** quick-add disubmit ulang setelah timeout, **When** outbox tersinkron, **Then** idempotency key menghasilkan tepat satu transaksi.

## Test matrix

| Area | Kasus minimum | Level |
|---|---|---|
| Kalkulasi | income, expense, refund, internal transfer, archived account | Unit/property |
| Status | lifecycle draft/posted/void; clearing pending/cleared/reconciled; committed toggle | Unit |
| Waktu | DST, pergantian hari/bulan, perubahan timezone, leap day | Unit/integration |
| Mata uang | zero-decimal, 2/3-decimal, negative adjustment, missing FX, rounding | Unit/property |
| Offline | cold cache, stale cache, outbox mutation, conflict, recovery | Integration/E2E |
| RLS | household member/non-member, restricted account, permission revocation, RPC invoker | SQL integration |
| UI | small screen, dynamic type, screen reader, reduced motion, dark/system setting | Component/E2E |
| Kinerja | 100k transaksi lokal, payload partial, rapid refresh | Benchmark |
| Privasi | app switcher, analytics payload, crash logs, deep links | Security/E2E |

## Implementation slices dan dependensi

1. **Slice A — Kontrak & kalkulator:** shared money/date/status types, pure aggregate functions, fixture lintas mata uang. Dependensi: akun/transaksi/kategori.
2. **Slice B — Local-first read model:** skema SQLCipher, reactive queries, snapshot rebuild, outbox invalidation.
3. **Slice C — Supabase RPC & RLS:** indeks, `rpc_get_daily_dashboard`, snapshot job, SQL tests lintas user.
4. **Slice D — UI inti:** cards, skeleton/empty/partial/offline states, privacy mode, deep links.
5. **Slice E — Integrasi:** budget, recurring, goals, review badge, quick actions receipt/voice.
6. **Slice F — Hardening:** accessibility, benchmark, analytics allowlist, background blur, E2E offline.

## Rollout dan kill-switch

- Feature flag remote `dashboard_v1_enabled` per app version; default off sampai migrasi dan backfill snapshot selesai.
- Rollout internal 100% → beta 10% → 50% → 100%, dengan pantauan crash-free sessions, RPC p95, mismatch aggregate, dan refresh error.
- Shadow-compare aggregate lokal vs server; kirim hanya boolean mismatch dan bucket selisih, tanpa nominal.
- Kill-switch mematikan RPC/snapshot baru dan kembali ke kalkulasi lokal sederhana; data transaksi tidak dihapus.
- Flag terpisah `dashboard_net_worth_card_enabled` dan `dashboard_review_card_enabled` memungkinkan isolasi kartu bermasalah.
- Rollback schema bersifat additive: hentikan writer/read path, pertahankan kolom/tabel sampai semua versi lama tidak aktif.
