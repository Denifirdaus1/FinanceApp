# F20 — Import, Export, dan Backup Portabel

**Status:** Core export / planned import · **Phase:** Phase 1 basic export, Phase 4 complete import/export · **Priority:** P0 untuk export, P1 untuk import

## Outcome dan JTBD

Pengguna memiliki kendali atas datanya, dapat pindah dari spreadsheet/aplikasi lain, dan memiliki salinan portabel. JTBD: “Saya ingin mulai tanpa mengetik ulang semuanya dan bisa membawa data saya keluar kapan pun.”

## Scope

- Export CSV human-readable dan JSON versioned untuk account, transaction/split, category/tag, budget, goal, recurring, debt, rate, serta audit metadata yang relevan.
- Optional attachment archive dengan password-based encryption dan manifest hashes.
- Import CSV dengan mapping wizard, locale/date/currency parsing, preview, validation, dedupe, dry run, batch commit, dan rollback batch.
- OFX/QIF dapat ditambah via adapter setelah CSV stabil.
- Database backup platform tetap operasi Supabase; user export bukan pengganti disaster recovery.

**Non-scope:** mengimpor credential bank, menjamin kompatibilitas semua format proprietary, atau menyertakan auth token/provider secrets.

## UX flow

### Import

Pilih file → deteksi encoding/delimiter → pilih account/defaults → map columns → preview valid/error rows → pilih duplicate policy → dry run summary → explicit confirm → progress/resumable batch → reconciliation report/undo batch.

### Export

Pilih range dan data type → pilih CSV atau JSON → optional receipts → re-auth untuk sensitive export → generate asynchronously → download/share melalui OS safe sheet → signed link expiry/automatic cleanup.

## Functional requirements

- **F20-FR-001:** Export JSON memiliki `schema_version`, generated_at, locale/timezone, currency metadata, checksums, dan stable IDs.
- **F20-FR-002:** CSV menggunakan UTF-8, documented headers, ISO-8601 date, decimal string, dan raw/display fields terpisah.
- **F20-FR-003:** Export tidak pernah berisi session, OAuth identity token, service key, internal security log, deleted-other-user data, atau hidden account tanpa permission.
- **F20-FR-004:** Import parser tidak mengeksekusi formula; cell berawalan `=`, `+`, `-`, atau `@` di-escape saat diekspor dan diperlakukan text saat import.
- **F20-FR-005:** Preview menunjukkan exact parsed amount/date/currency/kind/account/category serta reason per invalid row.
- **F20-FR-006:** Import commit memiliki `import_job_id`; semua mutations idempotent dan dapat di-undo bila belum direkonsiliasi dengan perubahan lanjutan.
- **F20-FR-007:** Dedupe memakai source fingerprint yang dinormalisasi plus user review; fuzzy match tidak menghapus row otomatis.
- **F20-FR-008:** File dan generated archive memiliki size/row quota, timeout, virus/content validation bila diproses server, dan auto-expiry.
- **F20-FR-009:** Account deletion export mencakup machine-readable data sesuai permission dan tercatat di privacy request ledger.

## Data dan interfaces

Tables: `import_jobs`, `import_rows`, dan `data_export_jobs`. Store only sanitized row errors; original upload berada di private temporary bucket dengan TTL. Fields: household, created_by, source format, schema version, hash, status, counts, options, created/completed/expires, error_code. Privacy export memakai `data_export_jobs`; account deletion memakai kontrak F24 `account_deletion_requests`, bukan tabel request paralel.

```ts
interface ImportAdapter { inspect(file: LocalFile): Promise<FileProfile>; parse(mapping: ColumnMap): AsyncIterable<ImportCandidate>; }
interface Exporter { stream(request: ExportRequest): AsyncIterable<Uint8Array>; }
```

Parsing amount/date dilakukan deterministic berdasarkan mapping explicit, bukan locale guessing yang diam-diam. Server batch memakai RPC transaction per bounded chunk; failure melaporkan committed vs rejected counts dan dapat dilanjutkan dengan idempotency.

## Offline, privacy, dan security

Small CSV dapat diparse lokal; commit menunggu online. Raw file tidak masuk analytics/log. Temp file dihapus setelah cancel/completion/expiry. Export receipt archive membutuhkan step-up authentication dan warning saat share keluar app. Password archive tidak mengirim password ke server bila encryption dilakukan lokal; recovery password bukan tanggung jawab server.

## Analytics

Event: `import_started`, `import_preview_completed`, `import_completed`, `import_undo_completed`, `export_requested`, dan `export_completed`. Property hanya format, row/file-size bucket, valid/rejected/duplicate count bucket, include-attachments boolean, outcome, error category, serta latency bucket; nama file, row content, amount, attachment, dan download URL dilarang.

## Acceptance criteria

- **Given** CSV IDR memakai `1.250.000`, **when** mapping locale `id-ID` dipilih, **then** preview menunjukkan Rp1.250.000 dan exact stored minor amount.
- **Given** row sama di-import dua kali, **when** idempotency/fingerprint cocok, **then** duplicate ditandai dan tidak otomatis dibuat ulang.
- **Given** user hanya punya akses ke dua shared accounts, **when** export household dibuat, **then** hanya data yang diotorisasi yang masuk.
- **Given** import gagal pada chunk ketiga, **when** retry dilakukan, **then** dua chunk awal tidak berduplikasi dan progress dilanjutkan aman.

## Test matrix

UTF-8/BOM; comma/semicolon/tab; id-ID/en-US numbers; date ambiguity; formulas; huge/zip bomb; corrupt file; invalid currency; duplicates; transfer pairs; partial error; cancel/resume/undo; RLS; receipt permissions; export-import round trip; account deletion; low disk/offline.

## Delivery dan rollout

1. JSON/CSV export tanpa attachments sejak private alpha.
2. CSV import inspect/map/preview.
3. Batched commit/dedupe/undo.
4. Encrypted attachment archive.
5. OFX/QIF adapters berdasarkan demand.

Kill switch menonaktifkan upload/import baru atau attachment export; plain core-data export dan privacy request harus tetap tersedia melalui jalur aman alternatif.
