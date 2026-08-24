# F16 — Search, Review & Reconciliation

## Metadata

- **Status:** Siap implementasi
- **Fase:** Phase 1–3
- **Prioritas:** P1
- **Platform:** Expo React Native iOS/Android
- **Dependensi wajib:** `financial_entries`, `entry_splits`, `accounts`, receipt OCR, voice capture, recurring, kurs snapshot, Supabase RLS, SQLCipher

## Outcome dan JTBD

**Outcome:** pengguna dapat menemukan record secara cepat, menyelesaikan data yang meragukan, dan mencocokkan ledger terhadap statement account tanpa kehilangan audit trail.

**JTBD:** “Ketika data keuangan bertambah, saya ingin mencari transaksi, meninjau item yang belum yakin, dan memastikan saldo ledger sesuai statement supaya catatan saya dapat dipercaya.”

Reconciliation adalah pemeriksaan catatan pribadi, bukan audit resmi, bukan nasihat finansial/akuntansi/pajak, dan bukan konfirmasi saldo oleh bank.

## Scope

- Global search transaksi, akun, kategori, tag, recurring, goal, debt, dan attachment metadata yang diizinkan.
- Structured filters: date, amount, `entry_type`, `lifecycle_status`, `clearing_status`, account, category, tag, currency, source, has receipt/note.
- Local full-text search untuk merchant/payee, note, OCR text, dan voice transcript di SQLCipher.
- Saved search pribadi tanpa menyimpan hasil.
- Review inbox untuk OCR/voice low-confidence, possible duplicate, missing category/FX, stale pending, recurring unmatched, sync conflict, dan reconciliation stale.
- Bulk resolve untuk tindakan aman yang homogen; preview dan undo terbatas.
- Reconciliation per account dan statement period: opening/closing balance, cleared items, difference, finalization/reopen.
- Explicit adjustment transaction untuk selisih bila user memilih.
- Offline search/review/draft reconciliation.

## Non-scope

- Audit akuntansi tersertifikasi, pajak, dispute bank, fraud determination, atau auto-delete transaksi.
- Server-side indexing plaintext OCR, transcript, atau encrypted notes.
- Fuzzy AI semantic search tidak termasuk rilis awal fitur ini.
- Auto-merge duplicate tanpa konfirmasi.
- Open-banking statement import; CSV/receipt statement import dapat menjadi fitur terpisah.
- Multi-user reviewer/approval workflow tidak termasuk rilis awal fitur ini.

## Kontrak lintas fitur

- Semua uang persisten memakai `amount_minor bigint` + `currency_code`; `numeric` hanya untuk FX/percentage.
- Ledger kanonis memakai satu header `financial_entries` dan `entry_splits`: search menampilkan header, saldo/reconciliation menjumlah `amount_minor` bertanda pada `line_type='account'`, dan reporting memakai `line_type='category'` dengan `amount_minor > 0`; `line_role` hanya semantic role.
- Header memakai `entry_type=income|expense|transfer|balance_adjustment|refund|reversal`, `lifecycle_status=draft|posted|void`, dan `clearing_status=pending|cleared|reconciled`; filter dan delta saldo mengikuti field/line kanonis tersebut.
- Transfer dikecualikan dari consolidated income/expense tetapi kedua leg selalu masuk reconciliation account masing-masing.
- Reconciliation memakai entry `posted` dengan clearing `cleared|reconciled` dalam currency account; `pending`, `draft`, dan `void` dikecualikan.
- Review item adalah pointer/alasan, bukan salinan data sensitif.
- Ledger search memakai `business_date` untuk display/grouping dan `occurred_at` untuk urutan/boundary; reconciliation memakai exact `cutoff_at timestamptz` statement.
- Finance/read-model memakai household audit/version/tombstone. RLS memerlukan membership + `private.can_access_account(p_household_id,p_account_id,p_action)` (`read|write|manage`) pada setiap account/entry sumber; cache/index lokal SQLCipher.

## UX flow

### Search

1. User mengetuk Search; recent filter lokal dapat tampil tetapi query sensitif tidak disinkronkan.
2. Ketik ≥2 karakter menjalankan local FTS debounced; structured chip dapat digunakan tanpa text.
3. Hasil dikelompokkan berdasarkan type dan diurutkan relevance lalu date; tap membuka detail setelah household/account-permission check.
4. Jika coverage lokal tidak lengkap dan online, user dapat “Cari data lama” memakai structured server search; encrypted text tetap local-only.
5. Saved search menyimpan filter/canonical query sesuai opsi eksplisit.

### Review

1. Inbox mengelompokkan berdasarkan reason/severity operasional, bukan penilaian moral.
2. Card menampilkan evidence minimum yang relevan dan aksi: edit, confirm, merge/link, dismiss, isi FX/kategori, resolve conflict.
3. Resolve memperbarui source dalam command atomik, mencatat resolution, dan menawarkan undo bila aman.
4. Dismiss membutuhkan reason code, dapat muncul lagi hanya jika evidence version berubah.

### Reconciliation

1. User memilih account, memasukkan statement start/cutoff dan closing balance dalam currency account.
2. Sistem mengambil last finalized opening atau opening balance, lalu account lines dari entry actual yang eligible.
3. User menandai item verified, menambah missing transaction, atau memperbaiki item melalui transaction flow.
4. Difference selalu terlihat. Finalize hanya bila difference tepat nol dan tidak ada mutation pending pada range.
5. Jika user membuat adjustment, preview menjelaskan bahwa ini transaction ledger eksplisit; bukan perubahan saldo diam-diam.
6. Edit/delete setelah finalized menandai reconciliation stale dan membuat review item; history dipertahankan.

## Functional requirements

- **F16-FR-001:** Text search lokal tidak mengirim query atau hasil ke server/analytics.
- **F16-FR-002:** Normalisasi dan ranking search deterministik sesuai aturan di bawah.
- **F16-FR-003:** Structured server search mematuhi RLS dan hanya kolom allowlist; tidak mencari ciphertext/OCR/transcript.
- **F16-FR-004:** Search result stabil dipaginasi dan menyatakan local coverage.
- **F16-FR-005:** Review reason dibuat/dedupe berdasarkan source + reason + evidence version.
- **F16-FR-006:** Possible duplicate tidak pernah auto-delete/merge; user melihat kedua record dan dampaknya.
- **F16-FR-007:** Bulk action memvalidasi seluruh item sebelum commit dan all-or-nothing bila mengubah ledger.
- **F16-FR-008:** Reconciliation calculated balance memakai exact account-leg formula.
- **F16-FR-009:** Header `clearing_status=pending` atau `lifecycle_status=draft|void` tidak dapat ditandai reconciled.
- **F16-FR-010:** Finalize memerlukan difference=0 minor unit, tidak ada pending local outbox dalam cutoff, dan server source version cocok.
- **F16-FR-011:** Finalized period immutable; perubahan berikut membuat revision/reopen dengan audit, bukan overwrite.
- **F16-FR-012:** Adjustment dibuat sebagai entry `balance_adjustment`, lifecycle posted, clearing cleared, signed account line eksplisit, serta reason/link; entry tidak masuk cashflow.
- **F16-FR-013:** Transfer direconcile per leg pada account terkait tanpa menjadi income/expense.
- **F16-FR-014:** Semua resolve/finalize RPC idempotent serta aman terhadap household/account-permission boundary.

## Aturan search exact

### Text normalization

- Input Unicode NFKC, lowercase locale-insensitive, trim/collapse whitespace, dan diacritic folding untuk token pencarian; original display tidak berubah.
- Token split pada whitespace/punctuation; token minimum 2 karakter, maksimum query 100 karakter/10 token.
- Quoted phrase harus contiguous dalam normalized text. Prefix match hanya pada token terakhir dan minimum 2 karakter.
- Local FTS fields dengan weight: merchant/payee 5, category/tag name 3, note 2, OCR/transcript 1.
- Ranking: FTS BM25 weighted, lalu `occurred_at desc`, lalu `id desc`; exact normalized merchant mendapat boost deterministik.
- Query amount dikenali hanya lewat filter amount/currency explicit atau parser locale saat user memilih suggestion; plain “100” tetap text agar tidak ambigu.

### Structured search

- Amount operators `=`, `<`, `<=`, `>`, `>=`, range memakai native `amount_minor` + selected currency.
- Date range half-open dalam timezone user; default `lifecycle_status=posted` dengan clearing `pending|cleared|reconciled`; draft/void hanya melalui filter eksplisit.
- Transfer dapat dicari tetapi label tetap transfer.
- Server searchable allowlist: `entry_type`, `occurred_at/business_date`, lifecycle/clearing, amount/currency, dan permitted account/category/tag IDs; merchant/note/OCR/transcript encrypted tidak diindeks server.
- Pagination keyset `(occurred_at desc,id desc)`; perubahan data dapat mengubah total namun cursor tidak menghasilkan duplicate dalam snapshot `source_version`.
- Recent queries default hanya memory/session; persistence lokal opt-in dan auto-expire 30 hari.

## Aturan review exact

- `low_confidence_receipt|voice`: dibuat jika required field confidence di bawah threshold config version; resolution confirm/edit/dismiss.
- `possible_duplicate`: candidate hanya dalam household dan accessible account scope bila `entry_type`, currency, absolute amount sama serta dates berjarak ≤1 hari dan bukti merchant/hash/import cocok. Ini suggestion, bukan fakta.
- `missing_category`: entry `entry_type=expense`, `lifecycle_status=posted`, clearing pending/cleared/reconciled tanpa category line.
- `missing_fx`: item yang butuh base conversion tanpa snapshot.
- `stale_pending`: `clearing_status=pending` lebih dari user threshold, default 7 hari expense/income dan 3 hari transfer.
- `unmatched_recurring`: transaction memenuhi candidate F13 tetapi belum matched; tidak dibuat bila user dismissed untuk evidence version sama.
- `sync_conflict`: mutation memerlukan pilihan user.
- Dedupe key: `(household_id,subject_user_id,account_scope_hash,source_type,source_id,reason_code,evidence_version)`.
- Resolution tidak menghapus source; merge duplicate memilih canonical lalu memakai `lifecycle_status=void` hanya untuk draft atau entry `reversal` untuk posted source setelah preview/confirmation, dengan reversible link/audit.

## Aturan reconciliation exact

- Statement currency wajib sama dengan account currency; reconciliation tidak memakai FX.
- Range `(previous_cutoff_at, current_cutoff_at]`. Untuk reconciliation pertama, gunakan semua eligible entries dari `opening_balance_as_of` hingga cutoff.
- `calculated_closing = opening_reconciled_balance_minor + Σ entry_splits.amount_minor` dari `line_type='account'` eligible dalam range.
- Sign dibaca dari account line, bukan diinferensikan dari `entry_type`; liability UI boleh menampilkan outstanding positif melalui adapter.
- `difference = statement_closing_balance - calculated_closing`.
- Entry eligible jika lifecycle posted, clearing cleared/reconciled, `occurred_at <= cutoff_at`, bukan reversal ganda, dan account line belum dimiliki reconciliation finalized lain pada account.
- Entry `clearing_status=pending` serta lifecycle draft/void excluded dan tidak dapat di-check.
- `balanced` hanya jika difference tepat `0` minor unit; tidak ada tolerance tersembunyi.
- Finalize atomik menyimpan source version, item IDs + signed amounts snapshot, hash ledger, dan closing balance.
- Overlap finalized period pada account ditolak. New period start tepat setelah previous cutoff.
- Setelah finalized, perubahan lifecycle/clearing atau amount account line included menandai `stale`; original snapshot tetap immutable. Reopen membuat revision `n+1` tanpa menghapus revision lama.
- Adjustment pilihan user: buat `entry_type=balance_adjustment`, `lifecycle_status=posted`, signed account line sebesar `difference_minor`, dan optional positive category line `Balance adjustment`; entry dikecualikan cashflow, ditautkan ke session, lalu formula dihitung ulang sebelum finalize.
- Finalize menandai account line pada session; header transfer baru dipromosikan ke `clearing_status=reconciled` setelah seluruh account line-nya direkonsiliasi, sehingga reconciliation akun lain tidak bocor/terlewati.

## Entitas dan fields

### `saved_searches`

- `id uuid`, `user_id uuid`, `household_id uuid`, `name text` (1–60), `entity_types text[]`; user-only preference
- `structured_filters jsonb`, `encrypted_text_query text null`, `schema_version`
- `created_by`, `updated_by`, `created_at`, `updated_at`, `version`, `deleted_at`; account filters tetap divalidasi ulang pada setiap eksekusi.

### `review_items`

- `id uuid`, `household_id`, `subject_user_id`, `account_scope_hash`, `permission_version`, `source_type`, `source_id`, `reason_code`
- `evidence_version bigint`, `state open|in_progress|resolved|dismissed`
- `severity info|attention`, `resolution_code text null`, `resolved_at`, `resolved_source_version`
- `dedupe_key text unique`, `created_by`, `updated_by`, audit/version/tombstone fields; derived pointer/read model, bukan source of truth.
- Worker hanya membuat row untuk source yang dapat dilihat subject user; revoke permission meng-invalidasi row dan RLS melarang metadata restricted source.

### `duplicate_links`

- `id`, `household_id`, `created_by`, `updated_by`, `canonical_entry_id`, `duplicate_entry_id`
- `action linked|voided|unlinked`, `evidence_code`, `created_at`, `reversed_at null`, version/tombstone; kedua entry dan seluruh account line wajib accessible.

### `reconciliation_sessions`

- `id uuid`, `household_id`, `created_by`, `updated_by`, `account_id`, `revision integer`
- `period_start_exclusive timestamptz`, `cutoff_at timestamptz`, `timezone text`
- `currency_code char(3)`, `opening_balance_minor bigint`, `statement_closing_minor bigint`, `calculated_closing_minor bigint`, `difference_minor bigint`
- `status draft|in_progress|balanced|finalized|stale|reopened`
- `source_version bigint`, `ledger_hash text`, `finalized_at`, `supersedes_id uuid null`
- audit/version/tombstone fields.

### `reconciliation_session_items`

- `household_id`, `created_by`, `updated_by`, `reconciliation_session_id`, `financial_entry_id`, `entry_split_id`
- `amount_minor bigint` (snapshot tanda asli account line), `currency_code char(3)`, `occurred_at`, `business_date`, `entry_version`, `verified boolean`
- Unique active `(reconciliation_session_id,entry_split_id)`; finalized snapshot immutable; version/tombstone fields tetap ada untuk sync/audit.
- Snapshot bukan financial source of truth dan RLS selalu re-check `private.can_access_account(household_id,account_id,'read')`; revocation memblokir snapshot lama.

Local table `search_fts` adalah FTS5 dalam SQLCipher dan tidak disinkronkan.

## Service, query, dan RPC

- `SearchNormalizer`, `LocalSearchIndex`, `ReviewRuleEngine`, dan `ReconciliationCalculator` pure/testable.
- `SearchRepository.searchLocal(query,filters,cursor)` + `rpc_search_structured(p_filters,p_cursor,p_source_version)`.
- `rpc_upsert_saved_search(p_payload,p_expected_version,p_idempotency_key)` menyimpan encrypted query hanya bila opt-in; expected version null hanya untuk create.
- `rpc_get_review_inbox(p_reasons,p_cursor)` dan `rpc_resolve_review_item(p_id,p_action,p_payload,p_expected_version,p_idempotency_key)`.
- `rpc_scan_review_rules(p_since_cursor,p_expected_source_version,p_mutation_id)` worker idempotent yang membangun subject-scoped read model accessible-only.
- `rpc_create_reconciliation_session(p_payload,p_idempotency_key)`, `rpc_refresh_reconciliation_session(p_id,p_expected_version,p_idempotency_key)`, dan `rpc_finalize_reconciliation_session(p_id,p_ledger_hash,p_expected_version,p_idempotency_key)`.
- `rpc_reopen_reconciliation_session(p_id,p_reason_code,p_expected_version,p_idempotency_key)` membuat revision baru.
- Indeks: `financial_entries (household_id,lifecycle_status,clearing_status,occurred_at,id)` dan `(household_id,business_date)`, `entry_splits (household_id,account_id,financial_entry_id)`, permissions, subject-scoped review, dan sessions.

## Offline dan sinkronisasi

- FTS5 dan index metadata berada dalam SQLCipher; update index satu transaction dengan source mutation.
- Query text tidak masuk outbox. Saved search text dienkripsi client sebelum sync; server tidak dapat memakainya untuk full-text.
- Review resolution dan reconciliation draft masuk command outbox idempotent.
- Finalize memerlukan online round-trip karena harus mengunci account/source version; offline UI hanya dapat menyimpan draft/precheck.
- Jika transaction delta tiba setelah draft dihitung, draft menjadi `needs_refresh`; selection user dipertahankan dan formula dihitung ulang.
- Jika finalized reconciliation terdampak delta/edit, server membuat stale review item; tidak silently mengubah snapshot.
- Merge menggunakan server version/cursor. Conflicting resolution mempertahankan server state dan menampilkan source latest.
- Rebuild local FTS aman dari source lokal; outbox tidak pernah dihapus saat rebuild.

## Keamanan dan privasi

- RLS finance/read-model memakai membership dan helper exact dengan action `read|write|manage`; saved search user-only juga mewajibkan `user_id=auth.uid()` + membership household.
- RPC filter/action payload memakai schema allowlist; setiap resource ID diverifikasi household serta seluruh linked account/entry permission, termasuk pada bulk action.
- SQLCipher menyimpan OCR/transcript/search index; server tidak menerima raw query atau plaintext field encrypted.
- Saved text query default off; jika on, encrypted dengan per-user key sebelum sync dan dapat dihapus.
- Search/review/reconciliation tidak memuat data ke analytics, push, logs, crash breadcrumbs, atau clipboard.
- Attachment thumbnails memakai signed URL singkat, no public bucket, dan dibersihkan dari memory/cache sesuai policy.
- Adjustment dan duplicate void membutuhkan biometric re-auth jika global sensitive-action setting aktif.

## States dan errors

- **Search empty/no result:** bedakan belum ada data, filter terlalu sempit, dan local coverage partial.
- **Indexing:** structured/local recent results tetap tersedia; progress tanpa mengunci UI.
- **Review empty:** “Tidak ada yang perlu ditinjau” tanpa klaim semua data benar.
- **Source changed:** card refresh atau resolution diblokir sampai evidence terbaru.
- **Reconciliation draft/balanced/finalized/stale:** state dan cutoff selalu terlihat.
- **Difference nonzero:** finalize disabled; detail formula dan pilihan edit/add adjustment.
- **Pending outbox/race:** finalize disabled dengan daftar jumlah item, tanpa nominal di log.
- **Offline:** search/review/draft aktif; finalize menjelaskan butuh koneksi.
- **Unauthorized/corrupt cursor:** generic not found atau restart pagination, tanpa leak.

## Analytics yang aman privasi

- Events: `search_opened`, `search_results_rendered`, `review_inbox_viewed`, `review_action_result`, `reconciliation_started`, `reconciliation_finalize_result`.
- Allowlist: `entity_type_count`, `filter_count_bucket`, `query_length_bucket`, `result_count_bucket`, `reason_code`, `action_code`, `reconciliation_state`, `is_offline`, `result`, `duration_bucket`.
- Dilarang: query/tokens, amounts/currency balance, names/notes/OCR/transcript, exact dates, account/transaction/reconciliation IDs, difference.
- Possible duplicate telemetry tidak menyertakan merchant/hash/source identifiers.

## Acceptance criteria (Given–When–Then)

1. **Given** merchant “Kedai Crème”, **When** user mencari “creme”, **Then** local normalized FTS menemukan transaksi tanpa mengubah display original.
2. **Given** OCR text ada hanya di SQLCipher, **When** server structured search dipanggil, **Then** OCR/query tidak terkirim dan hasil server tidak mengklaim full-text coverage.
3. **Given** dua expense sama amount/date+merchant, **When** review scan berjalan, **Then** possible-duplicate dibuat sekali dan tidak ada record auto-delete.
4. **Given** account opening 1.000.000 dan signed account lines +500.000, -200.000, -100.000 dari entry `posted+cleared`, **When** reconcile dihitung, **Then** calculated closing 1.200.000.
5. **Given** statement closing 1.210.000, **When** draft dibuka, **Then** difference +10.000 dan finalize disabled sampai tepat nol.
6. **Given** entry `clearing_status=pending` 50.000 dalam period, **When** reconciliation dihitung, **Then** entry tidak masuk calculated closing dan tidak dapat dicentang.
7. **Given** finalized reconciliation lalu account line included diedit, **When** delta diterapkan, **Then** snapshot tetap, state stale, dan review item dibuat.
8. **Given** user B mengirim account/entry household yang tidak boleh ia akses ke finalize/resolve RPC, **When** request diproses, **Then** seluruh aksi ditolak tanpa metadata atau aggregate leak.

## Test matrix

| Area | Kasus minimum | Level |
|---|---|---|
| Search | Unicode/diacritic, phrase/prefix, amount/date/entry-type/lifecycle/clearing filters | Unit/golden |
| Index | insert/edit/delete/tombstone, encrypted OCR, rebuild, partial coverage | Integration |
| Review | each reason, dedupe, evidence version, dismiss/reopen, bulk atomicity | Unit/integration |
| Duplicate | date boundary, transfer, refund, same amount different merchant, receipt hash | Unit |
| Reconciliation | signs, transfer legs, cutoff boundary, exact zero, overlap/revision | Unit/property |
| Concurrency/offline | stale draft, pending outbox, finalize race, idempotent retry | Integration/E2E |
| Security/privacy | non-member/restricted account, permission revocation/read-model invalidation, log leak | SQL/security |
| UX/a11y | keyboard/search, dynamic type, screen reader diff/state, large lists | Component/E2E |
| Performance | 100k FTS rows, 10k review items, 50k reconciliation legs | Benchmark |

## Implementation slices dan dependensi

1. **Slice A — Local search:** normalization, FTS5 schema/indexer, structured filters, coverage/paging.
2. **Slice B — Secure server search:** allowlisted RPC, RLS, cursor/source version, saved-search encryption.
3. **Slice C — Review engine:** reason generators/dedupe, inbox/actions, source-version guard.
4. **Slice D — Reconciliation math/schema:** account legs, cutoff formula, revision/immutable snapshot, SQL tests.
5. **Slice E — Reconciliation UX:** draft selection, difference, adjustment preview, online finalize/reopen.
6. **Slice F — Offline/sync:** outbox commands, stale propagation, conflict handling, FTS rebuild.
7. **Slice G — Hardening:** privacy assertions, accessibility, security/concurrency/performance E2E.

## Rollout dan kill-switch

- Flags: `search_v1`, `review_inbox_v1`, `duplicate_review_v1`, `reconciliation_v1`, `reconciliation_adjustment_v1`.
- Local search internal → beta 25% → 100%; review reasons per-rule flags; reconciliation read/draft → finalize 10% → 50% → 100%.
- Guardrail: query latency/crash, duplicate false-dismiss rate, review duplication, finalize conflict/mismatch, stale propagation failures.
- Privacy canary asserts analytics/log allowlist; telemetry hanya counts/buckets, tidak mengirim query/amount/source ID.
- Kill-switch server search kembali ke local-only; kill-switch review generator menghentikan item baru tetapi item existing tetap resolvable; kill-switch finalize mempertahankan drafts read-only.
- Derived FTS/review suggestions dapat direbuild. Finalized reconciliation, revisions, duplicate links, dan user resolutions tidak dihapus saat rollback.
