# F04 — Kategori, Tag & Aturan Otomatis

## Status, fase, dan prioritas

- Status: Siap diimplementasikan
- Fase: Phase 1
- Prioritas: Tinggi, menjadi dependensi klasifikasi transaksi
- Data: Supabase Postgres + RLS, cache/outbox SQLCipher

## Outcome dan Jobs To Be Done

Pengguna dapat mengelompokkan transaksi secara konsisten dan mengurangi input berulang melalui aturan yang deterministik, dapat dijelaskan, serta selalu dapat ditinjau.

**JTBD:** Ketika mencatat banyak transaksi serupa, saya ingin kategori dan tag yang rapi serta saran otomatis agar laporan akurat tanpa mengklasifikasikan semuanya dari awal.

## Scope

- Kategori pemasukan/pengeluaran bawaan dan kustom.
- Hirarki kategori maksimal dua level, icon/color token, urutan, dan arsip.
- Tag bebas dengan warna token dan relasi many-to-many ke transaksi.
- Rule engine lokal/server yang deterministik untuk menyarankan kategori/tag berdasarkan atribut transaksi.
- Rule priority, enable/disable, preview terhadap sampel lokal, dan penjelasan rule yang cocok.
- Penggantian/merge kategori dan tag tanpa kehilangan histori.

## Non-scope

- Klasifikasi AI/LLM berbasis cloud, rule regex pengguna, scripting, atau rule yang mengeksekusi pembayaran.
- Budget dan goal meski memakai kategori.
- Taxonomy lintas household atau katalog kategori komunitas.
- Perubahan transaksi historis massal otomatis tanpa preview dan konfirmasi.

## Alur UX

1. Saat household dibuat, template kategori locale Indonesia disalin ke household secara idempoten: makanan, transportasi, tagihan, belanja, kesehatan, hiburan, pendidikan, gaji, bonus, dan lainnya.
2. Pengguna membuka daftar kategori per `Pengeluaran`/`Pemasukan`, membuat subkategori, mengurutkan, mengedit, atau mengarsipkan.
3. Pengguna membuat tag dari transaksi atau halaman pengaturan; autocomplete mencegah duplikasi nama yang hanya berbeda kapital/spasi.
4. Rule builder memilih kondisi seperti merchant mengandung teks, rentang nominal, akun, entry type, dan hari; lalu action kategori/tag.
5. Preview menampilkan jumlah kecocokan dari transaksi lokal, tanpa mengirim konten ke layanan eksternal.
6. Saat input transaksi, rule aktif dievaluasi berdasarkan priority dan specificity. UI menampilkan `Disarankan oleh aturan …`.
7. Pengguna mengonfirmasi atau mengganti hasil; penggantian tidak diam-diam mengubah rule.
8. Merge/replace kategori menampilkan jumlah referensi dan menjalankan RPC atomik setelah konfirmasi.

## Functional requirements

- **F04-FR-001:** Kategori memiliki `kind` bernilai tepat `expense` atau `income`; picker hanya menampilkan kategori yang sama dengan `financial_entries.entry_type`. Pilihan UX “keduanya” membuat dua row berbeda secara atomik, masing-masing satu `kind`, tanpa enum gabungan.
- **F04-FR-002:** Template awal dicopy per household sehingga anggota berizin dapat mengedit tanpa memengaruhi household lain.
- **F04-FR-003:** Hirarki dibatasi dua level: parent dan child; parent tidak boleh menjadi child dari dirinya atau turunannya.
- **F04-FR-004:** Kategori/tag yang pernah dipakai diarsipkan, bukan hard-delete.
- **F04-FR-005:** Merge harus memindahkan seluruh referensi transaksi/rule secara atomik dan mengarsipkan sumber.
- **F04-FR-006:** Nama tag unik per household menggunakan `normalized_name`; original casing dipertahankan untuk tampilan.
- **F04-FR-007:** Rule condition hanya memakai operator allowlist: `equals`, `contains`, `starts_with`, `in`, `gte`, `lte`, `weekday_in`.
- **F04-FR-008:** Pencocokan teks menggunakan normalisasi Unicode NFKC, lowercase locale-insensitive, trim, dan collapse whitespace.
- **F04-FR-009:** Rule dievaluasi menurut `priority DESC`, `specificity DESC`, lalu `created_at ASC`; kategori hanya diambil dari pemenang pertama, tag dapat digabung tanpa duplikasi.
- **F04-FR-010:** Rule tidak pernah langsung menyimpan transaksi; hasil hanya mengisi draft/review.
- **F04-FR-011:** Preview rule menampilkan hit count dan maksimal 20 contoh dalam household yang dapat diakses aktor, seluruhnya diproses lokal.
- **F04-FR-012:** Perubahan rule dapat offline dan memiliki version/expected version saat sinkron.
- **F04-FR-013:** Sistem menjelaskan rule yang cocok dengan label kondisi, bukan exposing JSON mentah.
- **F04-FR-014:** Bulk apply ke histori merupakan iterasi lanjutan Phase 1 dan selalu meminta rentang tanggal, preview perubahan, serta konfirmasi final.
- **F04-FR-015:** Default fallback `Lainnya` selalu tersedia sebagai dua row berbeda, masing-masing `kind = 'expense'` dan `kind = 'income'`, serta tidak dapat diarsipkan sebelum pengganti sejenis dipilih.

## Aturan validasi dan bisnis

- Nama kategori setelah trim 1–40 karakter; tag 1–30 karakter; catatan rule 0–80 karakter.
- Unique kategori aktif: `(household_id, kind, parent_id, normalized_name)`; kategori terarsip dapat memiliki nama sama. UX “keduanya” tunduk pada validasi kedua row sebelum commit atomik.
- Maksimal 100 kategori aktif, 200 tag aktif, 100 rule aktif per household untuk menjaga UX/performa; arsip tidak dihitung.
- Rule wajib memiliki 1–8 kondisi dan setidaknya satu action; semua kondisi dalam satu rule memakai AND pada cakupan awal Phase 1.
- Merchant text condition minimal 2 karakter dan maksimal 80; tanpa regex/wildcard.
- Amount condition tersimpan di `classification_rule_amount_conditions.amount_minor bigint` bersama `currency`; jika currency tidak sama, condition tidak match tanpa konversi implisit. Nilai uang tidak disimpan sebagai JSON number.
- Priority integer 0–1000; perubahan urutan mengalokasikan ulang dengan interval 10.
- Rule yang merujuk akun/kategori/tag terarsip otomatis `disabled_reason = 'dependency_archived'`.
- Mengganti kategori hasil saran hanya mengubah draft; pilihan `Perbarui aturan ini` merupakan tindakan terpisah dengan konfirmasi.

## Entitas dan field data

### `categories`

- `id uuid`, `household_id uuid`, `created_by uuid`, `updated_by uuid`, `parent_id uuid null`
- `name text`, `normalized_name text`, `kind text` — hanya `expense` atau `income`
- `icon_key text`, `color_token text`, `sort_order integer`
- `is_system_fallback boolean`, `archived_at timestamptz null`
- `created_at`, `updated_at`, `version bigint`

### `tags`

- `id uuid`, `household_id uuid`, `created_by uuid`, `updated_by uuid`, `name text`, `normalized_name text`
- `color_token text`, `archived_at`, timestamps, `version`

### `entry_tags`

- `entry_id uuid`, `tag_id uuid`, `created_at`
- Primary key `(entry_id, tag_id)`; household dan akses divalidasi melalui parent `financial_entries`, membership aktif, serta seluruh account lines entry.

### `classification_rules`

- `id uuid`, `household_id uuid`, `created_by uuid`, `updated_by uuid`, `name text`, `enabled boolean`
- `priority integer`, `conditions jsonb`, `actions jsonb`
- `disabled_reason text null`, `last_matched_at timestamptz null`, `match_count bigint default 0`
- `created_at`, `updated_at`, `version bigint`

`conditions` disimpan sebagai AST berversi, contoh `{ "schemaVersion": 1, "all": [{ "field": "merchantNormalized", "op": "contains", "value": "indomaret" }] }`. `actions` hanya mengizinkan `categoryId` dan array `tagIds`. Node nominal hanya menyimpan `amountConditionId`, bukan angka uang JSON.

### `classification_rule_amount_conditions`

- `id uuid`, `rule_id uuid`, `node_key text`, `operator text`
- `amount_minor bigint not null`, `currency_code char(3) not null`, timestamps
- Satu-satunya sumber operand uang rule; child mengikuti household/RLS parent `classification_rules` dan tidak menjadi ledger atau sumber reporting.

## Services, interface, dan RPC

```ts
interface ClassificationInput {
  entryType: 'income' | 'expense';
  amountMinor: string;
  currency: string;
  accountId: string;
  merchant?: string;
  note?: string;
  occurredAt: string;
}

interface RuleEngine {
  evaluate(input: ClassificationInput, rules: ClassificationRule[]): {
    categoryId?: string;
    tagIds: string[];
    matchedRuleIds: string[];
    explanationKeys: string[];
  };
}
```

- `RuleEngine` berupa modul TypeScript murni dengan fixture yang sama untuk mobile dan server verification.
- RPC `seed_default_categories_v1(p_household_id uuid, p_template_version int, p_mutation_id uuid)` idempoten pada `(household_id, auth.uid(), mutation_id)`.
- RPC `upsert_classification_rule_v1(p_household_id uuid, p_rule jsonb, p_expected_version bigint, p_mutation_id uuid)` memvalidasi AST allowlist, amount-condition rows, membership, dan semua account references.
- RPC `merge_category_v1(p_source_id, p_target_id, p_expected_versions jsonb, p_mutation_id uuid)` memindahkan split/rule secara atomik.
- RPC `merge_tag_v1(...)` melakukan deduplikasi `entry_tags` sebelum mengarsipkan sumber.
- View `active_categories_v1` dan query delta berdasarkan `(updated_at,id)` mendukung sync.

## Offline, sinkronisasi, dan konflik

- Category/tag/rule cache berada di SQLCipher dan tersedia penuh offline.
- Seed template dapat dilakukan lokal dari bundle lalu disatukan dengan hasil RPC berdasarkan stable `template_key`.
- Mutasi memakai UUID client-generated dan outbox; create/edit/archive/merge adalah command berbeda dengan unique idempotency scope `(household_id, actor_user_id, mutation_id)`.
- Konflik edit nama/icon/priority dapat di-merge per field; parent, `kind`, merge, archive, conditions, dan actions memerlukan expected version serta review.
- Rule evaluation selalu menggunakan snapshot rule lokal terbaru. Hasil draft menyimpan `rule_version` agar perubahan rule setelah draft dibuat tidak mengubah draft diam-diam.
- Merge offline tidak diizinkan karena dapat menyentuh banyak referensi; UI meminta koneksi. Arsip sederhana boleh offline selama dependensi lokal lolos dan diverifikasi server kemudian.
- Jika server menolak arsip karena dependensi yang tidak ada di cache, item dikembalikan aktif dan UI menampilkan alasannya.

## Permissions, privasi, dan keamanan

- RLS `categories`, `tags`, `classification_rules`, amount-condition rows, dan seluruh relasi anak memverifikasi baris aktif `household_members`; tidak ada policy kepemilikan personal.
- Rule yang menaut account wajib lolos `account_permissions` dan `private.can_access_account(p_household_id, p_account_id, p_action)`, sedangkan `entry_tags` memeriksa household parent dan setiap linked account pada entry.
- JSON rule divalidasi ulang di server: field/operator/action allowlist, ukuran payload maksimal 16 KB, kedalaman AST tetap satu grup pada cakupan awal Phase 1.
- Tidak ada evaluasi kode dinamis, `eval`, regex pengguna, URL fetch, atau template interpolation.
- Preview hanya membaca transaksi household yang dapat diakses aktor dari cache terenkripsi dan tidak mengirim merchant/note ke analytics.
- Nama kategori/tag dapat sensitif; log hanya mencatat ID teracak/correlation ID dan kode hasil, bukan nama.
- RPC security-definer menetapkan `search_path` tetap, memeriksa household serta account permission setiap ID, dan revoke execute dari role yang tidak diperlukan.

## State dan error

- List: `loading`, `ready`, `empty_custom`, `offline`, `syncing`, `error`.
- Rule: `enabled`, `disabled`, `dependency_archived`, `invalid_after_upgrade`, `conflict`.
- Nama duplikat: arahkan ke item yang ada dan tawarkan batal/edit, bukan membuat duplikat tersembunyi.
- Cycle kategori: ditolak lokal dan server.
- Rule schema versi lebih baru dari client: tampil read-only dan minta update aplikasi; tidak menghapus rule.
- Preview besar: batasi sampel lokal 5.000 transaksi terbaru dan jelaskan bahwa hit count adalah estimasi bila data lokal parsial.

## Analytics tanpa payload sensitif

- `category_created { kind, depth }`
- `category_archived { had_references }`
- `category_merged { source_reference_count_bucket }`
- `tag_created { source }`
- `rule_created { condition_count, action_types, priority_bucket }`
- `rule_suggestion_result { accepted, overridden, matched_rule_count }`
- `rule_sync_result { operation, result, error_class }`

Tidak mengirim nama kategori/tag/rule, merchant, note, nominal, currency, account ID, condition value, atau transaction ID.

## Acceptance criteria (Given–When–Then)

1. **Given** household baru, **When** seed dijalankan ulang oleh anggota berizin dengan template version sama, **Then** satu set kategori tercipta tanpa duplikasi.
2. **Given** kategori dua level, **When** child dijadikan parent dari parent-nya, **Then** validasi lokal dan server menolak cycle.
3. **Given** dua rule cocok, **When** transaksi dievaluasi, **Then** kategori berasal dari urutan priority/specificity deterministik dan explanation menampilkan rule pemenang.
4. **Given** rule menyarankan kategori, **When** pengguna menggantinya, **Then** draft mengikuti pilihan pengguna dan rule tidak berubah otomatis.
5. **Given** kategori sumber memiliki histori, **When** merge dikonfirmasi, **Then** seluruh referensi berpindah atomik dan sumber terarsip.
6. **Given** perangkat offline, **When** tag baru dibuat dan dipakai pada draft, **Then** UUID referensi tetap valid setelah sinkron.
7. **Given** anggota household A, **When** mencoba memasukkan tag household B atau menaut entry dengan account yang tidak dapat ia akses, **Then** RLS/RPC menolak relasi.

## Test matrix

| Area | Kasus minimum | Jenis |
|---|---|---|
| Normalisasi | kapital, spasi, Unicode NFKC, karakter RTL | Unit/property |
| Hirarki | max depth, self-parent, cycle, archived parent | Unit + SQL |
| Rule engine | priority tie, specificity, text/amount/date/account, tag union | Golden fixture/property |
| Rule security | operator asing, oversized JSON, deep AST, spoofed IDs | SQL/security |
| Merge | banyak transaksi, duplicate tag relation, rollback pada error | Integrasi |
| Offline | create/edit/archive, restart, replay, server rejection | SQLCipher integration |
| UX | picker entry type, explanation, override, accessibility | E2E |
| Analytics | schema event dan tidak ada condition/PII | Contract test |

## Implementasi bertahap dan dependensi

1. **Slice 1 — Taxonomy:** schema kategori/tag, normalized constraints, RLS, seed template idempoten, list/picker/edit UI.
2. **Slice 2 — Relasi:** transaction tag contract, archive guard, merge RPC dan audit event.
3. **Slice 3 — Rule core:** AST v1, pure deterministic engine, golden fixtures, explainability, builder kondisi dasar.
4. **Slice 4 — Offline:** cache, outbox idempoten, rule version snapshot, conflict handling dan delta sync.
5. **Slice 5 — Phase 1 lanjutan:** preview lebih lengkap dan bulk apply dengan dry-run/konfirmasi/audit.

Dependensi: F01 household membership/RLS, F02 locale/currency, F03 account IDs dan account permissions. F05, F07, dan F08 memakai picker serta RuleEngine.

## Rollout dan kill switch

- Remote config: `custom_categories_enabled`, `tags_enabled`, `classification_rules_enabled`, `bulk_classification_enabled`.
- Taxonomy dirilis bersama ledger; rule engine dimulai internal, 10%, 50%, 100% setelah override/error rate sehat.
- `rule_schema_version` memungkinkan client lama mengabaikan rule baru secara read-only, bukan salah mengeksekusi.
- Kill switch rules menghentikan evaluasi dan menyembunyikan builder, tetapi kategori/tag manual tetap berfungsi dan rule tidak dihapus.
- Jika seed template bermasalah, bump template hanya menambah/memperbaiki item berdasarkan `template_key`; tidak menimpa kustomisasi household.
