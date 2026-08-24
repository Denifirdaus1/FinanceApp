# F05 — Pencatatan Transaksi Manual

## Status, fase, dan prioritas

- Status: Siap diimplementasikan
- Fase: Phase 1
- Prioritas: Fitur inti setelah akun dan kategori tersedia
- Arsitektur: Expo SDK 56 + Expo Router, Supabase RPC/RLS, SQLCipher offline outbox

## Outcome dan Jobs To Be Done

Pengguna dapat mencatat pemasukan atau pengeluaran secara akurat dalam beberapa detik, meninjau detail sebelum menyimpan, dan tetap bekerja tanpa jaringan.

**JTBD:** Ketika uang masuk atau keluar, saya ingin mencatat nominal, akun, kategori, dan konteksnya dengan cepat agar saldo dan laporan selalu dapat dipercaya.

## Scope

- Transaksi manual `expense` dan `income`.
- Input nominal, akun, kategori, tanggal/waktu, merchant/sumber, catatan, dan tag.
- Quick add, full form, review eksplisit, edit, duplikasi sebagai draft, dan soft-delete/restore.
- Saran kategori/tag deterministik dari F04.
- Ledger account/category lines atomik dan saldo optimistis offline.
- Deteksi potensi duplikat tanpa memblokir transaksi sah.
- Pencarian picker akun/kategori/tag dan recent selections.

## Non-scope

- Transfer, split, dan adjustment (F06).
- Scan struk (F07), voice entry (F08), transaksi berkala, impor bank, atau pembayaran aktual.
- Lampiran selain yang dikelola fitur receipt.
- Editing massal dan rekonsiliasi otomatis.

## Alur UX

1. Tombol `+` membuka quick add dengan mode terakhir; segmented control memilih `Pengeluaran` atau `Pemasukan`.
2. Fokus langsung ke nominal dengan keypad locale-aware. Pengguna memilih akun aktif.
3. Rule engine F04 menyarankan kategori/tag setelah atribut cukup; hasil berlabel sebagai saran.
4. `Lanjut` membuka review berisi tipe, nominal, akun, kategori, waktu, merchant/sumber, catatan, dan tag.
5. Hanya tombol `Simpan transaksi` pada review yang membuat transaksi posted; gesture back mempertahankan draft.
6. Saat offline, transaksi langsung muncul dengan badge `Menunggu sinkronisasi` dan saldo lokal diperbarui.
7. Detail transaksi menyediakan edit, duplikasi ke draft baru, dan hapus; hapus dapat dipulihkan selama 30 hari.
8. Edit selalu menampilkan dampak pada saldo bila akun, tipe, atau nominal berubah.

## Functional requirements

- **F05-FR-001:** Pengguna harus dapat membuat `expense` dan `income` dengan minimal nominal, akun, kategori, dan occurred time.
- **F05-FR-002:** Nominal disimpan sebagai `amount_minor bigint` bersama `currency` akun; aplikasi tidak memakai floating point untuk perhitungan uang.
- **F05-FR-003:** Untuk expense, signed account line akun aset bernilai negatif; income bernilai positif. `accounts.balance_kind` menormalkan presentasi akun liabilitas tanpa flag pengubah saldo atau mutasi saldo langsung.
- **F05-FR-004:** Header dan seluruh account/category lines/tag harus tersimpan dalam satu transaksi database melalui RPC.
- **F05-FR-005:** Draft lokal atau `financial_entries.lifecycle_status = 'draft'` tidak memengaruhi saldo; hanya entry `posted` yang berpengaruh. `confirmed_pending_sync` tetap state outbox lokal, bukan lifecycle server.
- **F05-FR-006:** Setiap save memakai `client_mutation_id`; retry dengan household dan aktor yang sama harus mengembalikan transaksi yang sama.
- **F05-FR-007:** Edit memakai `expected_version` dan menulis revision payload ke `audit_events` sebelum mengganti nilai aktif; audit bukan ledger kedua.
- **F05-FR-008:** Delete mengubah `lifecycle_status` menjadi `void` melalui RPC dan membuat audit event; saldo hanya berasal dari account lines entry `posted`.
- **F05-FR-009:** Restore selama 30 hari memulihkan transaksi bila semua dependensi masih berada dalam household dan dapat diakses aktor; setelah itu data dapat dipurge oleh retention job.
- **F05-FR-010:** Form menampilkan saran kategori/tag F04 tetapi tidak menyimpannya sampai review dikonfirmasi.
- **F05-FR-011:** Sistem memperingatkan potensi duplikat berdasarkan akun, arah, nominal, dan jendela waktu, namun pengguna boleh menyimpan setelah konfirmasi kedua.
- **F05-FR-012:** Merchant/sumber dan catatan bersifat opsional, dapat dicari lokal, dan tidak digunakan untuk iklan/profil eksternal.
- **F05-FR-013:** Date picker memakai zona waktu F02; server menyimpan `occurred_at` UTC dan immutable `business_date` yang dihitung dari zona waktu household, tanpa kolom waktu alternatif.
- **F05-FR-014:** Akun/kategori/tag yang diarsipkan tidak tersedia untuk transaksi baru tetapi tetap ter-render pada histori.
- **F05-FR-015:** Double tap atau lifecycle interruption tidak boleh menghasilkan transaksi ganda.
- **F05-FR-016:** Semua perubahan saldo UI harus dapat ditelusuri ke signed account lines; header amount, category lines, dan cache tidak pernah menjadi sumber saldo.

## Aturan validasi dan bisnis

- `amount_minor` wajib integer positif > 0 dan <= batas konfigurasi `9_000_000_000_000_000`; tanda ditentukan domain, bukan input pengguna.
- Currency transaksi harus sama dengan currency akun untuk expense/income pada Phase 1.
- `occurred_at` boleh hingga 50 tahun lalu dan maksimal 24 jam ke depan untuk mengakomodasi zona waktu; waktu lebih jauh membutuhkan fitur jadwal yang bukan scope.
- Merchant/sumber setelah trim maksimal 120 karakter; catatan maksimal 1.000 karakter; keduanya dinormalisasi Unicode dan dirender sebagai teks biasa.
- Tepat satu account line untuk transaksi manual sederhana dan tepat satu category line positif sebesar header `amount_minor`; header hanya nominal presentasi/source.
- `categories.kind` harus tepat sama dengan `entry_type` (`income` atau `expense`); kategori gabungan tidak dipersist.
- Maksimal 10 tag unik per transaksi; tag harus aktif dan berada dalam household yang sama.
- Duplicate candidate: akun, `entry_type`, `amount_minor`, `currency`, dan occurred time dalam ±10 menit; bila merchant tersedia, normalized merchant juga sama. Ini hanya warning.
- Edit transaksi tersinkron tidak mengubah `created_at`, `source`, atau mutation ID awal; `updated_at` dan `version` meningkat.
- Delete/restore memakai expected version untuk mencegah kehilangan edit perangkat lain.

## Entitas dan field data

### `financial_entries`

- Mengikuti persis tabel fisik kanonis `docs/04-data-model.md` §7.1; F05 tidak membuat varian header.
- Common tenant/sync: `id uuid primary key`, `household_id uuid not null`, `created_by uuid`, `created_at`, `updated_at`, `version bigint`, `deleted_at timestamptz null`.
- Field ledger: `entry_type`, `lifecycle_status`, `clearing_status`, `occurred_at`, `business_date`, `amount_minor bigint`, `currency_code`, `reporting_amount_minor bigint null`, `reporting_currency_code null`, `exchange_rate_id null`.
- Referensi/konteks: `merchant_id null`, `note null`, `source`, `source_metadata jsonb null`, `related_entry_id null`, `reversal_of_entry_id null`, `external_reference null`.
- Lifecycle timestamps: `confirmed_at null`, `cleared_at null`, `reconciled_at null`.
- `entry_type` hanya `income | expense | transfer | balance_adjustment | refund | reversal`; lifecycle hanya `draft | posted | void`; clearing hanya `pending | cleared | reconciled`.
- Merchant input draft di-resolve ke `merchants.id`; provenance rule/version masuk allowlist `source_metadata`; timezone household menghasilkan `business_date` dan tidak membuat kolom entry baru.
- Header `amount_minor > 0` hanya nominal source/presentasi. Read/mutation dan seluruh constraint, index, serta invariant mengikuti §7.1 melalui RPC kanonis.

### `entry_splits`

- Mengikuti persis tabel fisik kanonis `docs/04-data-model.md` §7.2; F05 tidak membuat posting/split schema alternatif.
- Common tenant/sync: `id uuid primary key`, `household_id uuid not null`, `created_by uuid`, `created_at`, `updated_at`, `version bigint`, `deleted_at timestamptz null`.
- Field ledger: `financial_entry_id`, `line_type text`, `line_role text`, `account_id null`, `category_id null`, `amount_minor bigint`, `currency_code`, `reporting_amount_minor bigint null`, `reporting_currency_code null`, `exchange_rate_id null`, `sort_order integer`, `note null`.
- Tepat satu `account_id`/`category_id` terisi sesuai `line_type`; account line signed dan non-zero, category line positif, seluruh parent/reference satu household, serta reporting amount/currency/rate konsisten.
- Untuk manual income/expense sederhana terdapat satu account line dan satu atau lebih category lines positif dengan total sama dengan header presentation amount; hanya account lines dari entry posted memengaruhi saldo.
- Direct mutation ditolak. RPC memeriksa semua account permissions dan deferred invariant §7.2 sebelum commit.

### `entry_tags`

- `financial_entry_id uuid`, `tag_id uuid`, primary key gabungan.

### Integrasi audit dan idempotensi (tanpa schema alternatif)

- F05 memakai `mutation_deduplication` persis §10.1: PK `(user_id, scope, idempotency_key)`, request hash mismatch menghasilkan `IDEMPOTENCY_REUSE_MISMATCH`, tanpa direct client access, dan row dikelola RPC dalam transaksi yang sama dengan ledger mutation.
- F05 memakai `audit_events` persis §10.3; tidak ada tabel revision fisik tambahan. RPC server menulis event `financial_entry_created`, `financial_entry_revised`, `financial_entry_voided`, atau `financial_entry_restored`.
- Metadata event hanya memuat allowlist seperti changed-field names, versi sebelum/sesudah, source, dan outcome; tidak pernah amount, note, merchant text, account/category ID terlarang, atau payload ledger.

## Services, interface, dan RPC

```ts
interface ManualEntryDraft {
  id: string;
  householdId: string;
  entryType: 'expense' | 'income';
  amountMinor: string;
  currency: string;
  accountId: string;
  categoryId: string;
  occurredAt: string;
  timezoneAtEntry: string;
  merchant?: string;
  note?: string;
  tagIds: string[];
}

interface FinancialEntryRepository {
  confirm(draft: ManualEntryDraft, mutationId: string): Promise<FinancialEntry>;
  update(id: string, patch: FinancialEntryPatch, expectedVersion: number, mutationId: string): Promise<FinancialEntry>;
  remove(id: string, expectedVersion: number, mutationId: string): Promise<void>;
  restore(id: string, expectedVersion: number, mutationId: string): Promise<FinancialEntry>;
}
```

- RPC `post_manual_entry_v1(p_household_id uuid, p_payload jsonb, p_mutation_id uuid)` memvalidasi membership, kategori/tag household, dan `private.can_access_account(p_household_id, p_account_id, p_action)` untuk setiap account line; lalu membuat header, lines, dan tags atomik.
- RPC `revise_financial_entry_v1(p_entry_id, p_patch jsonb, p_expected_version bigint, p_mutation_id uuid)` menulis `audit_events.revision_payload` dan update atomik.
- RPC `void_financial_entry_v1(...)` dan `restore_financial_entry_v1(...)` mengatur `lifecycle_status`, audit event, serta versi; waktu perubahan berasal dari timestamp/audit kanonis, bukan kolom lifecycle paralel.
- `DuplicateDetector` murni lokal/query terparameterisasi; `RuleEngine` berasal dari F04.
- Boundary JSON mengirim bigint sebagai string; parser Zod/Valibot mengubahnya ke domain money tanpa Number.

## Offline, sinkronisasi, dan konflik

- Draft dan confirmed transaction ditulis ke SQLCipher; draft bersifat device-local sampai pengguna menekan simpan.
- Konfirmasi offline menulis aggregate transaction + outbox dalam satu transaksi lokal. Saldo optimistis dihitung dari signed account lines lokal dengan state outbox pending.
- Replay outbox berurutan per aggregate, tetapi aggregate berbeda dapat diproses paralel dengan batas koneksi.
- Mutation ID membuat retry aman pada timeout setelah server mungkin sudah commit.
- Server pull memakai cursor `(updated_at,id)`, termasuk `deleted_at` tombstone.
- Konflik edit menggunakan expected version. Client mengambil versi server, menghitung diff per field, dan meminta pengguna memilih bila field sama berubah; tidak melakukan last-write-wins pada amount/account/entry type/occurred time.
- Edit terhadap transaksi pending mengganti command outbox yang belum dikirim; bila sedang in-flight, enqueue revision setelah post selesai.
- Jika dependency lokal ternyata sudah diarsip server, transaksi tetap sebagai draft error dan pengguna memilih dependency pengganti.

## Permissions, privasi, dan keamanan

- RLS header, `entry_splits`, `entry_tags`, `audit_events`, dan deduplication memastikan active household membership; tidak ada policy kepemilikan personal.
- Setiap linked account wajib lolos `account_permissions` dan `private.can_access_account(p_household_id, p_account_id, p_action)`; account/category/tag lintas household menggagalkan seluruh aggregate. Insert/update langsung ke ledger lines dibatasi, client memakai RPC.
- RPC memakai aktor `auth.uid()`, fixed `search_path`, allowlist field, dan transaksi serializable/appropriate row locks untuk versi.
- SQLCipher melindungi draft, ledger lines, merchant, catatan, dan outbox at rest.
- Catatan dapat dienkripsi di layer aplikasi dengan key member/device sesuai kebijakan recovery; server tidak memasukkan plaintext ke index/log.
- Input dirender sebagai teks, query diparameterisasi, dan panjang payload dibatasi untuk mencegah injection/DoS.
- Tidak ada nominal, merchant, catatan, category/tag ID, atau transaction ID dalam analytics dan crash breadcrumbs.
- Screen/app switcher mengikuti mask nominal F02.

## State dan error

- Form: `idle`, `editing`, `validating`, `review`, `saving_local`, `sync_pending`, `synced`, `conflict`, `failed`.
- Error field tampil inline dan fokus berpindah ke field pertama yang invalid.
- Timeout server setelah submit tidak memicu save baru; client menanyakan status mutation ID saat retry.
- Session expired mempertahankan transaksi terenkripsi dan meminta login ulang.
- Constraint/membership/account-permission error mengembalikan draft ke review dengan field terkait disorot.
- Soft-deleted transaction menampilkan tombstone dan tombol restore selama retention masih berlaku.

## Analytics tanpa payload sensitif

- `manual_entry_started { entry_type, entry_point }`
- `manual_entry_reviewed { field_completion_count, had_rule_suggestion, duplicate_warning }`
- `manual_entry_saved { entry_type, online_state, duration_bucket_s }`
- `manual_entry_sync_result { result, retry_count_bucket, error_class }`
- `financial_entry_edited { changed_field_keys, online_state }`
- `financial_entry_deleted { age_bucket_days }`
- `rule_suggestion_overridden { entry_type }`

Tidak mengirim nilai field finansial, nominal bucket, currency, merchant, note, category/tag/account/transaction ID, atau tanggal transaksi.

## Acceptance criteria (Given–When–Then)

1. **Given** akun dan kategori aktif, **When** pengguna mengonfirmasi expense 50.000, **Then** satu header, satu signed account line negatif, dan satu category line positif 50.000 tersimpan atomik.
2. **Given** pengguna belum membuka review, **When** keluar dari form, **Then** tidak ada account line posted yang memengaruhi saldo dan draft dapat dilanjutkan.
3. **Given** perangkat offline, **When** transaksi dikonfirmasi, **Then** histori/saldo lokal berubah, badge pending tampil, dan transaksi tersinkron tepat sekali saat online.
4. **Given** request timeout setelah commit server, **When** mutation ID dikirim ulang, **Then** server mengembalikan transaksi lama tanpa duplikat.
5. **Given** transaksi serupa dalam 10 menit, **When** review dibuka, **Then** warning duplikat tampil tetapi simpan tetap dapat dikonfirmasi.
6. **Given** dua perangkat mengedit amount yang sama, **When** perangkat kedua sinkron, **Then** konflik ditampilkan dan tidak ada perubahan diam-diam.
7. **Given** anggota household A atau anggota tanpa account permission, **When** mencoba post ke account/category household B atau account terlarang, **Then** RPC/RLS menolak seluruh operasi tanpa child parsial.

## Test matrix

| Area | Kasus minimum | Jenis |
|---|---|---|
| Money input | separator locale, paste, nol, negatif, bigint limit, IDR/USD | Unit/property |
| Ledger invariant | expense/income, signed account line, positive category line, lifecycle, atomic rollback | SQL/property |
| Form/review | required field, back/resume, double tap, accessibility | Component + E2E |
| Idempotency | retry sebelum/sesudah commit, duplicate mutation ID | Integrasi |
| Edit/delete | version conflict, audit revision, restore window | Integrasi/E2E |
| Offline | restart, queued dependency, in-flight edit, replay order | SQLCipher integration |
| Security | RLS child, spoofed IDs, oversized note, log redaction | Security test |
| Analytics | event schema dan zero sensitive payload | Contract test |

## Implementasi bertahap dan dependensi

1. **Slice 1 — Domain/RPC:** money parser, canonical header/entry-split schema, household/account RLS, post RPC idempoten, invariant SQL tests.
2. **Slice 2 — Quick add/review:** form, picker F03/F04, rule suggestion, explicit confirmation, detail/history minimum.
3. **Slice 3 — Offline:** aggregate local write, outbox replay, optimistic balance, pending/error UI, mutation-status recovery.
4. **Slice 4 — Lifecycle:** edit/version conflict, revision, soft-delete/restore, duplicate detector.
5. **Slice 5 — Hardening:** performance, accessibility, property tests, security/log/analytics redaction, crash recovery.

Dependensi: F01 auth/encryption, F02 timezone/format, F03 account ledger, F04 category/tag/rules. F07/F08 menghasilkan draft yang masuk ke review F05.

## Rollout dan kill switch

- Remote config: `manual_entries_enabled`, `offline_entry_outbox_enabled`, `duplicate_warning_enabled`, `entry_edit_enabled`.
- Rollout internal dengan invariant telemetry, lalu 5%, 25%, 100%; offline edit menyusul setelah post online stabil.
- Monitor post success, idempotency replay, invariant violation, sync latency bucket, dan crash-free flow tanpa data finansial.
- Kill switch offline ledger write mengizinkan draft lokal tetapi menonaktifkan konfirmasi saat offline; outbox yang sudah ada tidak dihapus.
- Jika edit bermasalah, detail menjadi read-only sementara dan create tetap aktif; ledger diperbaiki dengan forward migration/revision, bukan rewrite destruktif.
