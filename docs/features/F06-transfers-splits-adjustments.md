# F06 — Transfer, Split & Penyesuaian Saldo

## Status, fase, dan prioritas

- Status: Siap diimplementasikan
- Fase: Phase 1
- Prioritas: Tinggi setelah F05 stabil
- Arsitektur: ledger account/category lines atomik di Supabase, cache/outbox SQLCipher

## Outcome dan Jobs To Be Done

Pengguna dapat memindahkan uang, membagi satu transaksi ke beberapa kategori, dan mengoreksi perbedaan saldo tanpa menggandakan pengeluaran atau menghilangkan jejak audit.

**JTBD:** Ketika satu kejadian keuangan memengaruhi beberapa akun/kategori atau saldo nyata berbeda, saya ingin mencatatnya secara benar agar total saldo dan laporan tetap konsisten.

## Scope

- Transfer antar akun household yang dapat diakses aktor, termasuk fee opsional.
- Split expense/income ke beberapa kategori dan memo per bagian.
- Adjustment saldo berbasis delta dan rekonsiliasi ke saldo target.
- Cross-currency transfer dengan dua nominal eksplisit dan snapshot kurs pada iterasi lanjutan Phase 1.
- Edit/reverse dengan audit trail, offline aggregate commands, dan validasi invariant.
- Review dampak saldo sebelum konfirmasi.

## Non-scope

- Mengirim uang sungguhan, integrasi bank/payment rail, transfer terjadwal, settlement kartu kredit otomatis.
- Split bill antar orang, reimbursement workflow, atau approval transaksi berlapis.
- Kalkulasi FX live dan fee provider otomatis.
- Menghapus jejak koreksi historis atau overwrite saldo akun.

## Alur UX

### Transfer

1. Pengguna memilih akun sumber dan tujuan; akun yang sama tidak dapat dipilih dua kali.
2. Untuk mata uang sama, masukkan satu nominal. Untuk mata uang berbeda, masukkan nominal keluar dan masuk; UI menampilkan kurs implisit untuk review.
3. Fee opsional meminta nominal, akun pembayar, dan kategori fee.
4. Review menampilkan perubahan setiap akun. `Konfirmasi transfer` membuat satu aggregate atomik.

### Split

1. Dari form/review transaksi, pilih `Bagi kategori`.
2. Tambahkan 2–20 baris kategori, nominal atau persentase, dan memo opsional.
3. Sisa yang belum dialokasikan selalu terlihat. Tombol simpan aktif hanya saat total tepat sama.
4. Review transaksi menampilkan total dan seluruh split sebelum konfirmasi.

### Adjustment

1. Di detail akun, pilih `Sesuaikan saldo`, masukkan saldo aktual dan tanggal.
2. Aplikasi menghitung delta dan menjelaskan bahwa koreksi baru akan dibuat.
3. Pengguna memilih alasan allowlist dan catatan opsional, lalu mengonfirmasi.
4. Riwayat menampilkan adjustment terpisah; saldo lama tidak pernah ditimpa.

## Functional requirements

- **F06-FR-001:** Transfer mata uang sama membuat satu header `entry_type = 'transfer'` dan dua signed account lines: sumber `-amount`, tujuan `+amount`, dengan jumlah signed = 0.
- **F06-FR-002:** Transfer tidak diklasifikasikan sebagai income/expense dan dikecualikan dari agregasi arus kas kategori.
- **F06-FR-003:** Fee transfer disimpan sebagai entry expense terpisah dengan `related_entry_id` menunjuk header transfer, agar fee masuk laporan kategori tanpa reverse pointer pada `transfers`.
- **F06-FR-004:** Cross-currency transfer menyimpan `amount_minor bigint` + `currency` pada masing-masing source/destination account line serta `transfers.effective_rate numeric`; tidak memaksa jumlah minor units sama dan tidak menduplikasiasinya di tabel transfer.
- **F06-FR-005:** Split expense/income memiliki 2–20 category lines positif dan jumlah `amount_minor` tepat sama dengan presentation/source amount pada header.
- **F06-FR-006:** Pembulatan split persentase menggunakan largest remainder method; UI menunjukkan minor unit yang dialokasikan.
- **F06-FR-007:** Adjustment membuat entry `balance_adjustment` dengan satu signed account line delta; tidak pernah update kolom saldo langsung.
- **F06-FR-008:** Adjustment nol ditolak karena tidak mengubah keadaan.
- **F06-FR-009:** Seluruh header, account/category lines, fee entry terpisah, related/reversal link, dan audit event harus commit/rollback atomik.
- **F06-FR-010:** Setiap operasi membutuhkan review dan mutation ID idempoten dalam scope household + aktor.
- **F06-FR-011:** Edit transfer/split/adjustment tersinkron membuat revision payload lengkap di `audit_events`; bila periode terkunci, gunakan reversal + replacement.
- **F06-FR-012:** Reverse membuat entry pembalik yang menunjuk `reversal_of_entry_id`; histori asli tidak dihapus.
- **F06-FR-013:** Saldo preview memakai ledger lokal termasuk outbox pending dan memberi label bila belum sinkron.
- **F06-FR-014:** Account picker menolak archived account untuk operasi baru dan memfilter kemampuan currency/type.
- **F06-FR-015:** Pembuatan split dari hasil F07/F08 tetap menunggu konfirmasi manusia.
- **F06-FR-016:** Server menjalankan invariant checks setelah operasi sebelum commit.

## Aturan validasi dan bisnis

- Semua nominal berupa integer minor units positif di input; tanda hanya dibentuk service domain.
- Transfer source dan destination wajib berbeda, aktif, berada dalam household yang sama, dapat diakses aktor melalui `private.can_access_account(p_household_id, p_account_id, p_action)`, serta memiliki currency sama untuk rilis awal Phase 1.
- Cross-currency pada iterasi lanjutan Phase 1: kedua nominal > 0, decimal rate > 0 dengan maksimal 18 digit signifikan; rate disimpan informasional dan tidak menghitung ulang histori.
- Fee >= 0 dan tidak boleh melebihi batas money global; fee 0 tidak membuat transaksi fee.
- Split tidak boleh memakai kategori yang sama dua kali kecuali memo berbeda pada iterasi lanjutan Phase 1; rilis awal Phase 1 menggabungkan baris kategori sama.
- Setelah largest remainder, setiap split minimal satu minor unit dan total tepat sama.
- Adjustment delta = target balance − balance ledger pada `effective_at`; server menghitung ulang dan menolak bila basis version berubah.
- Alasan adjustment: `cash_count`, `bank_reconciliation`, `opening_correction`, `other`; `other` mewajibkan note 1–300 karakter.
- Transaksi pada periode locked tidak diedit/delete; hanya reversal pada periode terbuka.
- Transfer ke akun `balance_kind = 'liability'` diperlakukan sebagai pembayaran; signed source/destination lines tetap kanonis dan presentasi saldo dinormalisasi oleh `balance_kind`, dengan preview eksplisit.

## Entitas dan field data

### `financial_entries` (ekstensi F05)

- Menggunakan satu header F05: `id`, `household_id`, `created_by`, `updated_by`, `entry_type` (`income`, `expense`, `transfer`, `balance_adjustment`, `refund`, `reversal`).
- `lifecycle_status` (`draft`, `posted`, `void`) dan `clearing_status` (`pending`, `cleared`, `reconciled`).
- `related_entry_id uuid null`, `reversal_of_entry_id uuid null`
- `amount_minor bigint`, `currency_code char(3)`, `occurred_at`, `business_date`, `source`, `version`, timestamps; header amount hanya presentation/source amount dan lifecycle time mengikuti audit kanonis.

### `entry_splits`

- `id`, `financial_entry_id`, `line_type text` — `account` atau `category`
- Line akun: `account_id`, `category_id null`, `amount_minor bigint signed`, `currency_code`, `line_role` (`source`, `destination`, `primary`, `adjustment`)
- Line kategori: `account_id null`, `category_id`, `amount_minor bigint positive`, `currency_code`, `note`, `sort_order`
- Unique `(financial_entry_id, line_role)` untuk role akun tunggal; check constraint memastikan hanya account atau category yang terisi sesuai line type.
- Hanya account lines entry `posted` menjadi sumber saldo. Category lines menjadi sumber reporting; transfer tidak memiliki category line sehingga tidak pernah dihitung sebagai income/expense.

### `transfers`

- `entry_id uuid primary key`, FK one-to-one ke header `entry_type = 'transfer'`
- `source_split_id uuid unique`, `destination_split_id uuid unique`; keduanya menunjuk account lines header yang sama dengan role sesuai
- `effective_rate numeric null` — hanya untuk FX dan immutable setelah posted
- Nominal/currency hanya berasal dari kedua `entry_splits`; `transfers` tidak menjadi ledger atau sumber amount paralel.
- Fee, bila ada, adalah header expense terpisah dengan account + positive category lines dan `financial_entries.related_entry_id = transfer_entry_id`; tabel `transfers` tidak menyimpan fee pointer.

### `balance_adjustment_details`

- `entry_id uuid primary key`, `account_split_id uuid unique`
- `ledger_balance_before_minor bigint`, `target_balance_minor bigint`, `currency_code char(3)`
- `reason text`, `note_ciphertext text null`, `basis_version bigint`; actual delta hanya berasal dari signed account line yang dirujuk.

### `ledger_period_locks`

- `id`, `household_id`, `starts_at`, `ends_at`, `locked_at`, `locked_by`, `reason`
- Iterasi lanjutan Phase 1; dipersiapkan agar edit historis dapat ditolak secara konsisten.

## Services, interface, dan RPC

```ts
interface TransferDraft {
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAmountMinor: string;
  destinationAmountMinor: string;
  occurredAt: string;
  fee?: { amountMinor: string; accountId: string; categoryId: string };
}

interface LedgerCommandService {
  postTransfer(draft: TransferDraft, mutationId: string): Promise<FinancialEntryGroup>;
  postSplit(draft: SplitEntryDraft, mutationId: string): Promise<FinancialEntry>;
  adjustBalance(input: BalanceAdjustmentInput, mutationId: string): Promise<FinancialEntry>;
  reverse(entryId: string, expectedVersion: number, mutationId: string): Promise<FinancialEntry>;
}
```

- RPC `post_transfer_v1(p_household_id uuid, p_payload jsonb, p_mutation_id uuid)` mengunci account/version relevan, memeriksa membership + `private.can_access_account(p_household_id, p_account_id, p_action)` untuk kedua akun, dan membuat aggregate atomik/idempoten pada `(household_id, auth.uid(), mutation_id)`.
- RPC `post_split_entry_v1(...)` memverifikasi exact sum, household kategori, dan akses setiap linked account.
- RPC `adjust_account_balance_v1(p_account_id, p_target_minor bigint, p_effective_at, p_basis_version, p_reason, p_note, p_mutation_id)` menghitung delta server-side.
- RPC `reverse_financial_entry_v1(...)` menghasilkan header `reversal`, signed account lines kebalikan, category lines reporting yang sesuai, dan link audit tanpa mengubah entry asli.
- `SplitAllocator` TypeScript murni memakai bigint dan largest remainder; fixture yang sama dipakai pada validator server test.
- `LedgerInvariantService` memeriksa signed account lines transfer, positive category lines, exact split, currency, lifecycle, dan uniqueness sebelum commit.

## Offline, sinkronisasi, dan konflik

- Transfer/split/adjustment ditulis sebagai satu aggregate command terenkripsi; tidak ada child command yang dapat terkirim sendiri.
- UI mengaplikasikan account lines optimistis dan menandai seluruh group pending. Kegagalan server me-rollback proyeksi lokal sebagai satu unit, sambil mempertahankan draft untuk koreksi.
- Mutation ID dan aggregate ID dibuat client; retry pasca-timeout aman.
- Konflik saldo adjustment menggunakan `basis_version`; server mengembalikan saldo terbaru dan client meminta pengguna mengulas target/delta lagi.
- Transfer dan split tidak auto-merge. Jika dependency atau versi berubah, kembali ke review dengan diff dampak saldo.
- Edit command yang belum terkirim boleh diganti atomik di outbox. Setelah in-flight/committed, gunakan revision atau reversal.
- Cross-device pull mengurutkan group berdasarkan server `committed_at`; tampilan occurred time tetap milik transaksi.

## Permissions, privasi, dan keamanan

- Client tidak diberi izin insert/update langsung ke `entry_splits`/`transfers`; operasi hanya melalui RPC authenticated.
- RLS `financial_entries`, lines, `transfers`, adjustment details, `audit_events`, dan `ledger_period_locks` memeriksa active household membership; tidak ada policy kepemilikan personal.
- Setiap linked account, termasuk source, destination, fee, adjustment, reversal, dan replacement, wajib lolos `account_permissions` dan `private.can_access_account(p_household_id, p_account_id, p_action)`; ID lintas household atau tanpa izin menggagalkan seluruh transaksi.
- RPC security-definer memakai fixed `search_path`, statement timeout, row locking terarah, payload size limit, dan idempotency table.
- Catatan split/adjustment berada di SQLCipher lokal dan ciphertext/field terlindungi server; tidak masuk log atau analytics.
- Tidak ada account balance, amount, rate, account/category ID, atau alasan bebas dalam telemetry.
- Review menampilkan perubahan jelas untuk mencegah confused-deputy/user error; tidak ada aksi suara/OCR yang mengeksekusi langsung.

## State dan error

- `editing`, `invalid`, `review`, `committing_local`, `sync_pending`, `synced`, `needs_re_review`, `reversed`, `failed`; ini state UX/outbox, bukan nilai `lifecycle_status`/`clearing_status` server.
- Exact split belum terpenuhi menampilkan sisa/kelebihan dalam minor units dan menonaktifkan konfirmasi.
- Currency mismatch mengarahkan ke cross-currency flow jika feature flag aktif; jika tidak, jelaskan batasan.
- Adjustment basis stale mengembalikan saldo server terbaru tanpa menimpa target pengguna.
- Fee gagal divalidasi berarti seluruh transfer gagal; tidak ada transfer tanpa fee yang seharusnya terkait.
- Reverse kedua kali ditolak atau mengarahkan ke reversal dari transaksi pembalik agar audit chain eksplisit.

## Analytics tanpa payload sensitif

- `transfer_started { same_currency, has_fee }`
- `transfer_saved { online_state, same_currency, has_fee }`
- `split_started { entry_point }`
- `split_saved { line_count_bucket, allocation_mode }`
- `adjustment_saved { reason_key, online_state }`
- `ledger_command_result { command_type, result, error_class }`
- `financial_entry_reversed { original_type }`

Tidak mengirim nominal, currency, kurs, saldo, memo, nama/ID akun, kategori, transaction/group ID, atau custom reason.

## Acceptance criteria (Given–When–Then)

1. **Given** dua akun IDR, **When** transfer 100.000 dikonfirmasi, **Then** source account line −100.000, destination account line +100.000, jumlah signed nol, tidak ada category line, dan arus income/expense tidak berubah.
2. **Given** transfer dengan fee terpisah, **When** salah satu child gagal validasi, **Then** tidak ada transfer, fee entry, atau line parsial yang commit.
3. **Given** expense 100.000 dibagi 60%/40%, **When** disimpan, **Then** split tepat 60.000 dan 40.000 serta total tetap 100.000.
4. **Given** pembagian persentase menghasilkan sisa minor unit, **When** dialokasikan, **Then** largest remainder menghasilkan exact sum secara deterministik.
5. **Given** saldo ledger berubah di perangkat lain, **When** adjustment dengan basis lama sinkron, **Then** server menolak dan meminta review delta baru.
6. **Given** perangkat offline, **When** transfer dikonfirmasi dan aplikasi restart, **Then** kedua saldo optimistis serta group pending konsisten dan tersinkron sekali.
7. **Given** anggota household A atau anggota tanpa account permission mencoba tujuan account household B/terlarang, **When** RPC dipanggil, **Then** seluruh aggregate ditolak tanpa data parsial.

## Test matrix

| Area | Kasus minimum | Jenis |
|---|---|---|
| Transfer | same currency, fee, liability destination, same account reject | Unit + SQL |
| Cross-currency | rate precision, currency mismatch, immutable snapshot | Unit/integrasi Phase 1 lanjutan |
| Split | 2/20 lines, duplicate category, largest remainder, exact sum | Property test |
| Adjustment | positive/negative/zero delta, stale basis, reason validation | SQL/integrasi |
| Atomicity | failure setiap child stage dan retry idempoten | Fault-injection |
| Reverse | transfer/split/adjustment, double reverse, locked period | Integrasi |
| Offline | aggregate persist, rollback projection, conflict/re-review | SQLCipher E2E |
| Security | cross-household/account-permission IDs, direct line insert, payload/log redaction | Security test |

## Implementasi bertahap dan dependensi

1. **Slice 1 — Invariant core:** account-line roles, ledger invariant service, same-currency transfer RPC, household/account RLS, atomic/idempotency tests.
2. **Slice 2 — Transfer UX:** form, saldo preview, fee group, review, offline aggregate/outbox.
3. **Slice 3 — Split:** allocator bigint, split editor, exact-sum RPC, report integration.
4. **Slice 4 — Adjustment/reversal:** basis version, target-to-delta review, revision/reversal audit.
5. **Slice 5 — Phase 1 lanjutan:** cross-currency two-amount flow, immutable rate snapshot, period locks dan hardening.

Dependensi: F02 currency/timezone, F03 accounts/ledger, F04 categories, F05 transaction/revision foundation. F07/F08 dapat membuat draft split tetapi tidak menyimpan langsung.

## Rollout dan kill switch

- Remote config: `transfers_enabled`, `transfer_fees_enabled`, `split_entries_enabled`, `balance_adjustments_enabled`, `cross_currency_transfer_enabled`.
- Rollout per command type; same-currency transfer dan split lebih dahulu, adjustment setelah basis conflict metrics sehat, cross-currency terakhir.
- Monitor invariant violation, atomic rollback, idempotent replay, stale basis, dan sync latency tanpa nominal.
- Kill switch satu command menyembunyikan create/edit terkait tetapi detail histori dan export tetap read-only.
- Bila proyeksi saldo lokal bermasalah, matikan optimistic projection dan tampilkan status pending; signed account lines server sebagai source of truth tidak ditulis ulang.
