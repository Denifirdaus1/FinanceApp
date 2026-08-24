# F03 — Akun, Dompet, Aset & Liabilitas

## Status, fase, dan prioritas

- Status: Siap diimplementasikan
- Fase: Phase 1
- Prioritas: Wajib untuk pencatatan transaksi
- Arsitektur: Expo SDK 56, Supabase Postgres + RLS, SQLCipher offline-first

## Outcome dan Jobs To Be Done

Pengguna memiliki satu sumber kebenaran untuk tempat uang, nilai aset, dan kewajiban sehingga saldo serta kekayaan bersih dapat dijelaskan oleh transaksi atau riwayat valuasi.

**JTBD:** Ketika mengatur kondisi keuangan, saya ingin mencatat rekening, uang tunai, aset, dan utang agar tahu posisi saldo dan kekayaan bersih tanpa spreadsheet terpisah.

## Scope

- CRUD dan arsip akun: tunai, bank, e-wallet, kartu kredit, investasi, dan akun lain.
- Saldo awal melalui transaksi khusus, bukan menulis kolom saldo secara bebas.
- Aset non-transaksional dengan riwayat valuasi manual.
- Liabilitas dengan pokok tersisa, bunga informasional, jatuh tempo, dan pembayaran terkait transaksi.
- Pengurutan, warna/icon dari token aman, penyembunyian dari total, dan mata uang akun.
- Perhitungan saldo dan kekayaan bersih yang deterministik.
- Operasi offline, restore, dan konflik edit metadata.

## Non-scope

- Koneksi/open banking, sinkronisasi bank, trading, eksekusi pembayaran, dan data harga pasar otomatis.
- Kalkulator amortisasi resmi, nasihat investasi, credit scoring, atau laporan pajak.
- Transfer dan penyesuaian saldo lanjutan (F06), walau model account-line dipersiapkan.
- Multi-entitas bisnis dan approval transaksi berlapis; household membership serta account permissions dasar tetap wajib.

## Alur UX

1. Setelah profil selesai, pengguna melihat pilihan `Tambah akun` atau `Mulai dengan Tunai`.
2. Pengguna memilih jenis, nama, mata uang, mode akses, dan saldo awal beserta tanggal saldo.
3. Review menjelaskan bahwa saldo awal disimpan pada account sebagai basis saldo yang dapat diaudit; ikon tampilan diturunkan dari `accounts.type`.
4. Daftar akun mengelompokkan kas, utang/kartu, investasi, aset, dan item diarsipkan; total dapat disamarkan mengikuti F02.
5. Detail akun menampilkan saldo kini, transaksi terkait, metadata, dan tindakan edit/arsip.
6. Aset memiliki aksi `Perbarui nilai`; liabilitas memiliki aksi `Catat pembayaran` yang membuka transaksi terisi awal.
7. Arsip membutuhkan konfirmasi dan tidak menghapus histori. Akun aktif yang masih dipakai aturan/default harus dialihkan atau aturan dinonaktifkan.

## Functional requirements

- **F03-FR-001:** Tipe akun yang didukung mengikuti data model: `cash`, `bank`, `e_wallet`, `credit_card`, `investment`, `loan`, `receivable`, dan `other`; `balance_kind = 'asset' | 'liability'` menentukan normal balance dan presentasi net worth.
- **F03-FR-002:** Setiap akun memiliki mata uang ISO 4217 yang tidak dapat diubah setelah memiliki account line non-pembuka; pengguna harus membuat akun baru untuk mata uang berbeda.
- **F03-FR-003:** Saldo awal disimpan atomik pada `accounts.opening_balance_minor` dan `opening_balance_at`; perubahan berikutnya wajib melalui ledger, bukan menimpa basis pembuka.
- **F03-FR-004:** Saldo akun transaksional adalah `opening_balance_minor` ditambah jumlah `entry_splits.amount_minor` signed pada line akun dari entry `lifecycle_status = 'posted'` hingga timestamp yang dipilih; kolom cache, header amount, valuasi, dan line kategori bukan sumber saldo berjalan.
- **F03-FR-005:** Pengguna dapat menyembunyikan akun dari dashboard/net worth tanpa menghapus transaksi atau mengecualikannya dari ekspor.
- **F03-FR-006:** Akun dapat diarsipkan tetapi tidak hard-delete jika pernah direferensikan transaksi.
- **F03-FR-007:** Akun aset non-transaksional menyimpan valuasi bertanggal melalui `asset_valuations`; nilai terkini adalah valuasi efektif terbaru yang ditautkan ke akun, bukan sumber saldo paralel atau kolom yang ditimpa.
- **F03-FR-008:** Akun liabilitas menyimpan detail utang/terms tanpa menyimpan current balance kedua; perubahan saldo berasal hanya dari signed account lines pembayaran/adjustment atau rekonsiliasi eksplisit.
- **F03-FR-009:** Net worth memakai saldo kanonis akun menurut `balance_kind` dan, khusus akun valuasi non-transaksional, valuasi efektif terbaru; satu akun tidak boleh dihitung dari ledger dan valuasi sekaligus. Konversi ke base currency hanya dilakukan bila snapshot kurs tersedia.
- **F03-FR-010:** Bila kurs tidak tersedia, UI menampilkan subtotal per mata uang dan menandai total base currency tidak lengkap.
- **F03-FR-011:** Urutan akun pengguna harus stabil dan dapat diubah dengan drag; perubahan urutan tidak memengaruhi ledger.
- **F03-FR-012:** Pembuatan dan edit metadata bisa offline dengan UUID client-generated dan outbox idempoten.
- **F03-FR-013:** Setiap detail akun harus menyediakan jejak `created_at`, saldo pembuka, dan perubahan valuasi/rekonsiliasi dari `audit_events`; audit tidak menjadi ledger kedua.
- **F03-FR-014:** Akun sumber transaksi tidak boleh dipilih jika diarsipkan, kecuali saat mengedit transaksi historis yang sudah merujuknya.
- **F03-FR-015:** Kartu kredit tampil sebagai akun `balance_kind = 'liability'`; pengeluaran menambah jumlah terutang dan pembayaran mengurangi jumlah terutang melalui signed account lines sesuai normal balance.

## Aturan validasi dan bisnis

- Nama akun setelah trim 1–60 karakter; nama duplikat diperbolehkan tetapi UI memberi peringatan dan menampilkan tipe/empat karakter label opsional.
- `opening_balance_minor` wajib integer signed dalam rentang database `bigint` dan selalu dipasangkan dengan `currency_code`; input UI diparse dengan minor unit mata uang, tidak memakai floating point.
- Tanggal saldo awal tidak boleh lebih dari 50 tahun ke masa lalu atau lebih dari satu hari kalender lokal ke depan.
- Ikon tampilan diturunkan dari allowlist berdasarkan `accounts.type`; tidak ada kolom SVG/URL pengguna pada `accounts`.
- Arsip dilarang jika akun menjadi satu-satunya akun aktif dan masih ada draft/outbox transaksi yang merujuknya.
- Hard delete hanya boleh untuk akun tanpa transaksi/valuasi dan sebelum pernah sinkron; setelah sinkron gunakan arsip.
- Valuasi aset harus positif; timestamp valuasi unik per akun setelah resolusi detik dan overwrite membutuhkan expected version.
- Sisa pokok liabilitas dihitung dari signed account lines dan tidak boleh negatif kecuali jenis secara eksplisit mendukung saldo kredit; cakupan Phase 1 tidak mendukung saldo kredit.
- `include_in_net_worth = false` hanya mengubah agregasi tampilan, bukan data historis.

## Entitas dan field data

### `accounts`

- Common tenant/sync: `id uuid primary key`, `household_id uuid not null`, `created_by uuid`, `created_at`, `updated_at`, `version bigint`, `deleted_at timestamptz null`
- `type text` — `cash`, `bank`, `e_wallet`, `credit_card`, `investment`, `loan`, `receivable`, atau `other`
- `balance_kind text` — `asset` atau `liability`; `access_mode text` — `household` atau `restricted`
- `name text`, `institution_label text null`, `currency_code char(3)`, `last_four text null`
- `opening_balance_minor bigint`, `opening_balance_at date`, `include_in_net_worth boolean default true`
- `sort_order integer`, `archived_at timestamptz null`; `last_four`, bila ada, tepat empat digit dan tidak pernah memuat kredensial bank.

### `financial_entries` dan `entry_splits` (kontrak inti)

- Schema fisik lengkap mengikuti persis `docs/04-data-model.md` §7.1–7.2; daftar berikut hanya field yang dipakai langsung oleh F03 dan tidak membentuk varian tabel.
- `financial_entries`: `id`, `household_id`, `created_by`, `updated_by`, `entry_type` (`income`, `expense`, `transfer`, `balance_adjustment`, `refund`, `reversal`), `lifecycle_status` (`draft`, `posted`, `void`), `clearing_status` (`pending`, `cleared`, `reconciled`), `amount_minor bigint`, `currency_code char(3)`, `occurred_at`, `source`, `version`, timestamps.
- Header `amount_minor` + `currency` hanya nominal presentasi/source; keduanya bukan sumber saldo maupun agregasi kategori.
- `entry_splits`: `id`, `financial_entry_id`, `line_type` (`account` atau `category`), tepat salah satu `account_id`/`category_id`, `amount_minor bigint`, `currency_code char(3)`, `line_role`.
- Saldo akun hanya dihasilkan dari `sum(entry_splits.amount_minor)` signed untuk `line_type = 'account'` pada entry `lifecycle_status = 'posted'`; `clearing_status` tidak mengubah saldo.
- Line kategori selalu positif dan hanya menjadi sumber reporting income/expense; tidak ada flag tambahan yang dapat mengubah invariant saldo maupun pelaporan ini.

### `asset_valuations`

- Common tenant/sync: `id uuid primary key`, `household_id uuid not null`, `created_by uuid`, `created_at`, `updated_at`, `version bigint`, `deleted_at timestamptz null`
- `account_id uuid not null`, `valued_at timestamptz`, `value_minor bigint not null`, `currency_code char(3) not null`
- `source text default 'manual'`, `note text null`; parent wajib satu household dan bertipe aset non-transaksional.
- Read/write wajib lolos `private.can_access_account(p_household_id, p_account_id, p_action)` pada account tertaut. Valuasi tidak menggantikan opening balance atau ledger akun transaksional.

### `debts`

- `id uuid primary key`, `household_id uuid not null`, `created_by uuid`, `updated_by uuid`
- `account_id uuid null`, `name text`, `kind text` — `installment`, `mortgage`, `credit_card`, atau `manual`
- `tracking_mode text` — `ledger` atau `statement_assisted`; `currency_code char(3)`
- `opening_outstanding_minor bigint`, `opening_as_of date`, `credit_limit_minor bigint null`
- `include_in_net_worth boolean default true`, `status text` — `active`, `paid_off`, atau `archived`; `timezone text`
- Common sync/audit: `created_at`, `updated_at`, `version bigint`, `deleted_at timestamptz null`.
- Opening outstanding dan credit limit non-negatif. Linked account harus satu household, bertipe liability/credit, serta lolos `private.can_access_account(p_household_id, p_account_id, p_action)`; saldo actual tidak disimpan sebagai kolom berjalan kedua.

### `loan_terms`

- `debt_id uuid primary key`, `household_id uuid not null`, `created_by uuid`, `updated_by uuid`
- `apr_bps integer`, `payments_per_year integer` — hanya `12`, `26`, atau `52`
- `original_term_count integer`, `remaining_term_count integer`, `first_due_local_date date`
- `scheduled_payment_minor bigint null`, `periodic_fee_minor bigint default 0`; currency selalu diwarisi dari `debts.currency_code`
- `formula_version smallint`, `effective_from date`, `created_at`, `updated_at`, `version bigint`, `deleted_at timestamptz null`
- F03 hanya membuat shell debt minimum dan optional terms kanonis. F14 memiliki lifecycle lanjutan, pembayaran, statement, amortisasi, schedule, dan rekonsiliasi; seluruh dampak uang tetap berasal dari `financial_entries`/`entry_splits`, bukan `loan_terms`.

## Services, interface, dan RPC

```ts
interface AccountRepository {
  list(includeArchived?: boolean): Promise<Account[]>;
  create(input: NewAccount, mutationId: string): Promise<Account>;
  update(id: string, patch: AccountPatch, expectedVersion: number, mutationId: string): Promise<Account>;
  archive(id: string, expectedVersion: number, mutationId: string): Promise<void>;
  balanceAt(id: string, at: string): Promise<Money>;
}

interface NetWorthService {
  calculate(at: string): Promise<{ total?: Money; byCurrency: Money[]; completeness: 'complete' | 'partial' }>;
}
```

- RPC `create_account_with_opening_balance_v1(p_household_id uuid, p_account jsonb, p_idempotency_key uuid)` menulis account beserta basis pembuka secara atomik dan memakai `mutation_deduplication` persis §10.1.
- RPC `archive_account_v1(p_account_id, p_expected_version, p_idempotency_key)` memeriksa referensi draft/default/rule.
- RPC `record_asset_valuation_v1(...)` dan `upsert_debt_terms_v1(...)` memvalidasi `household_members`, `private.can_access_account(p_household_id, p_account_id, p_action)`, currency, serta expected version.
- View/security-definer function `account_balances_v1(p_household_id uuid, p_as_of timestamptz)` memakai `auth.uid()` untuk membership dan `private.can_access_account(p_household_id, p_account_id, p_action)`; setiap fungsi diberi fixed `search_path`.
- `Money` selalu `{ amountMinor: bigintString; currency: string }` di boundary JSON agar tidak kehilangan presisi JavaScript.

## Offline, sinkronisasi, dan konflik

- Account, valuation, debt, dan loan terms memiliki UUID v4/v7 yang dibuat client dan disimpan di SQLCipher.
- Pembuatan akun beserta opening balance ditulis sebagai satu aggregate command di outbox; UI tidak menulis dua mutasi terpisah.
- Replay memakai `idempotency_key`; RPC mengelola row `mutation_deduplication` kanonis dengan PK `(user_id, scope, idempotency_key)` pada transaksi database yang sama. Response server menggantikan state outbox lokal tanpa mengganti UUID.
- Konflik metadata memakai expected version dan merge per field; `currency`, saldo pembuka, valuasi pada timestamp sama, dan archive state memerlukan review eksplisit.
- Account lines ledger tidak di-merge last-write-wins. Konflik menghasilkan revision payload di `audit_events` atau adjustment baru agar jejak audit terjaga.
- Saldo lokal dihitung dari opening balance + signed account lines lokal/tersinkron pada entry posted; badge `Belum tersinkron` tampil bila ada aggregate pending.
- Pull sinkronisasi memakai cursor `(updated_at, id)` dan tombstone/`deleted_at` untuk objek yang memang boleh dihapus.

## Permissions, privasi, dan keamanan

- RLS seluruh data finansial memakai baris aktif `household_members`; akses account wajib melewati `account_permissions` dan helper `private.can_access_account(p_household_id, p_account_id, p_action)` sesuai aksi.
- Policy `accounts`, `asset_valuations`, `debts`, `loan_terms`, header, dan child memverifikasi household yang sama serta setiap linked account; tidak ada policy finance berbasis kepemilikan personal.
- Semua RPC mengambil aktor dari `auth.uid()`, menolak ID lintas household atau account tanpa izin, dan menggunakan transaksi database.
- Nama institusi, catatan aset, dan catatan utang tidak masuk analytics atau log; catatan disimpan terenkripsi aplikasi bila berisi data sensitif.
- Tidak menyimpan nomor rekening penuh, CVV, PIN, password bank, atau token institusi.
- Data lokal dan outbox berada di SQLCipher; kunci mengikuti kontrol F01.
- Screen capture nominal mengikuti preference F02 dan aksesibilitas tetap mempertahankan label generik saat masked.

## State dan error

- Daftar: `loading`, `ready`, `empty`, `offline`, `syncing`, `partial_currency`, `error`.
- Item: `local_only`, `sync_pending`, `synced`, `conflict`, `archived`.
- Saldo berbeda antara cache/server memicu recompute dari opening balance + signed account lines, bukan menulis paksa cache.
- RPC duplikat dengan mutation ID sama mengembalikan hasil awal.
- Arsip ditolak menampilkan dependensi yang harus dialihkan tanpa membocorkan ID teknis.
- Kurs hilang menampilkan subtotal mata uang; net worth tidak menampilkan angka yang tampak pasti tetapi salah.

## Analytics tanpa payload sensitif

- `account_created { type, currency_group: 'base'|'foreign', has_opening_balance }`
- `account_archived { type, had_pending_dependency }`
- `asset_valuation_recorded { asset_type, source }`
- `debt_terms_created { kind, has_due_date }`
- `net_worth_viewed { completeness, account_count_bucket }`
- `account_sync_result { operation, result, error_class }`

Tidak mengirim nama akun/institusi, currency code spesifik, nilai/saldo, due date, notes, maupun identifier objek.

## Acceptance criteria (Given–When–Then)

1. **Given** pengguna membuat dompet IDR dengan saldo awal 500.000, **When** RPC sukses, **Then** satu account dengan `opening_balance_minor` dan `opening_balance_at` tersimpan atomik tanpa entry pembuka paralel.
2. **Given** RPC yang sama dikirim ulang oleh user, scope, dan idempotency key yang sama, **When** server memprosesnya, **Then** tidak ada account duplikat dan response sebelumnya dikembalikan.
3. **Given** akun memiliki histori, **When** pengguna mengarsipkan, **Then** akun hilang dari picker baru tetapi tetap tampil pada transaksi historis.
4. **Given** anggota household A atau anggota tanpa account permission, **When** mencoba membaca/mengubah akun household B atau akun terlarang, **Then** RLS/RPC menolak.
5. **Given** dua mata uang dan kurs salah satunya tidak tersedia, **When** net worth dibuka, **Then** subtotal per mata uang tampil dan total ditandai tidak lengkap.
6. **Given** perangkat offline, **When** akun dibuat dan aplikasi direstart, **Then** akun/pembuka tetap ada terenkripsi dan tersinkron sekali saat online.
7. **Given** valuasi aset baru bertanggal lebih baru, **When** net worth dihitung, **Then** valuasi itu digunakan dan riwayat lama tidak dihapus.

## Test matrix

| Area | Kasus minimum | Jenis |
|---|---|---|
| Money | IDR/JPY 0 digit, USD 2 digit, batas bigint, input negatif | Unit/property |
| Opening balance | nol, positif, negatif valid per tipe, retry idempoten | SQL/integrasi |
| Balance | expense/income, soft-delete, timestamp as-of | SQL/property |
| Account lifecycle | create, edit, archive, referenced draft/rule | E2E |
| Asset/liability | valuation order, payment, rekonsiliasi, archive | Integrasi |
| Multi-currency | kurs lengkap/hilang/kedaluwarsa | Unit |
| Offline | local UUID, restart, replay, conflict | Integrasi SQLCipher |
| Security | cross-household ID, account permission bypass, RLS parent/child, fixed search path | SQL security test |

## Implementasi bertahap dan dependensi

1. **Slice 1 — Ledger minimum:** schema `accounts`/`financial_entries`/`entry_splits`, household/account-permission RLS, money types, balance query, SQL invariant tests.
2. **Slice 2 — Akun UX:** create/edit/list/detail, opening balance RPC, cache SQLCipher, picker transaksi.
3. **Slice 3 — Lifecycle/offline:** archive dependency guard, outbox aggregate, idempotency, optimistic metadata conflict.
4. **Slice 4 — Aset & liabilitas berbasis account:** valuation timeline, debts/loan terms, net-worth service dan incomplete FX behavior.
5. **Slice 5 — Hardening:** large dataset performance, accessibility, redaksi analytics/log, rekonsiliasi cache otomatis.

Dependensi: F01 auth/household membership/account permissions, F02 base currency/timezone. F05 dan F06 mengonsumsi ledger account lines; F04 dapat merujuk akun aktif.

## Rollout dan kill switch

- Remote config: `accounts_v1_enabled`, `asset_accounts_v1_enabled`, `debt_accounts_v1_enabled`, `net_worth_v1_enabled`.
- Akun dan ledger dirilis internal → 10% → 50% → 100%; aset/liabilitas dapat menyusul tanpa migrasi destruktif.
- Monitor invariant balance, RPC duplicate rate, outbox retry, dan query latency tanpa nilai finansial.
- Kill switch aset/liabilitas menyembunyikan entry point tetapi mempertahankan data dan read-only detail/export.
- Jika cache saldo bermasalah, matikan cache dan hitung dari opening balance + signed account lines server/lokal; source of truth tidak diubah.
