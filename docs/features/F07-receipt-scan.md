# F07 — Scan & Upload Struk

## Status, fase, dan prioritas

- Status: Siap diimplementasikan
- Fase: Phase 2
- Prioritas: Tinggi untuk mempercepat input pengeluaran
- Arsitektur terkunci: kamera/photo picker Expo SDK 56, OCR dan parser 100% on-device, draft SQLCipher, lalu Supabase private Storage hanya setelah konfirmasi dan hanya bila `keep_image = true`

## Outcome dan Jobs To Be Done

Pengguna dapat mengubah foto struk menjadi draft transaksi yang akurat tanpa mengirim gambar ke layanan OCR eksternal, lalu memeriksa setiap hasil sebelum menyimpan.

**JTBD:** Ketika selesai belanja, saya ingin memotret atau memilih struk agar merchant, tanggal, total, pajak, dan item terisi otomatis tetapi keputusan akhir tetap di tangan saya.

## Scope

- Ambil foto kamera atau pilih satu gambar melalui system photo picker.
- Crop, rotasi, koreksi perspektif, dan peningkatan kontras secara lokal.
- OCR on-device: ML Kit Text Recognition di Android dan Apple Vision di iOS, di balik interface adapter.
- Parser struk deterministik untuk merchant, tanggal, subtotal, pajak, diskon, tip/service, total, dan baris item.
- Layar review dengan confidence per field, koreksi, kategori, akun, tag, dan explicit confirmation.
- Draft gambar, OCR, dan hasil parse berada di sandbox lokal terenkripsi serta hanya dapat dibuka creator sebelum transaksi dikonfirmasi.
- Penyimpanan gambar struk ke bucket Supabase private bersifat opsional, selalu sesudah konfirmasi, dan hanya ketika pengguna mengaktifkan `Simpan gambar struk`.
- Proses offline: OCR/review lokal, `confirm_capture_v1` mem-post entry, splits, dan normalized `receipt_extractions` secara atomik ketika online; attachment dibuat setelah itu hanya bila `keep_image = true`.
- Riwayat attachment, buka ulang, ganti kaitan, unduh sementara, dan hapus sesuai retention.

## Non-scope

- Endpoint OCR server, OCR cloud sebagai default/fallback, ekstraksi invoice bisnis kompleks, multi-page PDF, handwriting guarantee, atau legal tax validation.
- Menghubungi merchant, klaim garansi, reimbursement, atau pembukuan pajak otomatis.
- Auto-save transaksi tanpa review.
- Menyimpan data kartu penuh, QR pembayaran, barcode loyalty, atau data pelanggan lain yang tidak diperlukan.
- Cloud OCR opsional hanya boleh dirancang sebagai fitur Phase 5 yang terpisah: opt-in eksplisit, vendor dan region terpilih, DPA/DPIA, disclosure tujuan, retention/deletion, consent versioning, dan kill switch sendiri. Fitur itu bukan jalur ekuivalen atau fallback Phase 2.

## Alur UX

1. Dari tombol `+` atau form F05, pengguna memilih `Scan struk`.
2. Aplikasi menjelaskan pemrosesan on-device; izin kamera diminta hanya bila pengguna memilih kamera. Gallery memakai system photo picker tanpa izin galeri luas.
3. Overlay kamera memberi panduan tepi, pencahayaan, blur, dan jarak. Pengguna dapat retake.
4. Pipeline lokal auto-rotate, mendeteksi dokumen, membuat crop terkoreksi, lalu menjalankan OCR tanpa upload.
5. Skeleton berubah menjadi review: foto thumbnail, field hasil, item, confidence indicator, dan warning bila subtotal/pajak/total tidak cocok.
6. Pengguna memilih akun/kategori dan memperbaiki field. Tombol `Simpan transaksi` aktif setelah validasi F05.
7. Pengguna memilih `Simpan gambar struk` secara eksplisit bila ingin mempertahankan foto. Konfirmasi menulis entry/splits dan normalized extraction lokal; tanpa opsi itu gambar dipurge tetapi extraction terkonfirmasi tetap disimpan.
8. Saat online, `confirm_capture_v1` mem-post entry/splits/extraction secara atomik. Hanya bila `keep_image = true`, row attachment yang sudah ter-link kemudian dibuat, file di-upload, diverifikasi, dan `receipt_extractions.attachment_id` diisi.
9. Detail transaksi hanya membuka struk bila actor masih dapat mengakses household dan account parent, memakai authenticated download atau signed URL singkat; share/export selalu tindakan eksplisit.

## Functional requirements

- **F07-FR-001:** Sumber hanya kamera dan system photo picker. JPEG, PNG, dan WebP diterima; HEIC boleh dipilih bila dikonversi lokal ke format allowlist sebelum upload.
- **F07-FR-002:** Sumber maksimal 15 MiB, 20 megapiksel, dan sisi maksimal 12.000 px; pipeline membuat working image maksimal 2.048 px tanpa menimpa pilihan asli.
- **F07-FR-003:** OCR dan parser Phase 2 wajib berjalan on-device melalui `ReceiptOcrAdapter`; image, thumbnail, text block, raw OCR text, dan bounding box tidak boleh dikirim ke endpoint OCR/server serta tidak ada cloud fallback tersembunyi.
- **F07-FR-004:** Android memakai ML Kit Text Recognition Latin bundled/on-device; iOS memakai Vision `VNRecognizeTextRequest`, bahasa `id-ID`/`en-US` sesuai kemampuan.
- **F07-FR-005:** Adapter mengembalikan text blocks, bounding boxes, dan confidence ternormalisasi hanya ke memori/domain lokal; capability check gagal harus berakhir di input manual.
- **F07-FR-006:** Parser memprioritaskan kandidat total dekat label allowlist (`TOTAL`, `GRAND TOTAL`, `JUMLAH`, `TOTAL BAYAR`) dan memvalidasi aritmetika subtotal − diskon + pajak/service ≈ total.
- **F07-FR-007:** Field confidence rendah atau hasil ambigu harus disorot dan tidak dianggap dikonfirmasi.
- **F07-FR-008:** Sebelum pengguna menekan konfirmasi, hanya ada draft lokal terenkripsi yang creator-only; tidak boleh ada row attachment, extraction, transaksi, object, atau upload session di Supabase.
- **F07-FR-009:** Item receipt bersifat opsional; kegagalan item parsing tidak boleh menghalangi pencatatan total yang sudah diverifikasi.
- **F07-FR-010:** Bila `Simpan gambar struk` tidak aktif, canonical entry/splits dan normalized `receipt_extractions` tetap disimpan dengan `financial_entry_id NOT NULL` serta `attachment_id = NULL`; tidak boleh ada row/metadata/object/upload session attachment dan seluruh original/working image lokal dipurge setelah local aggregate berhasil ditulis.
- **F07-FR-011:** Bila `Simpan gambar struk` aktif, upload baru boleh dimulai setelah konfirmasi dan setelah metadata attachment dibuat dengan `financial_entry_id NOT NULL`; bucket selalu private dan akses mengikuti household membership serta permission account parent.
- **F07-FR-012:** Open/download memakai signed URL maksimal 60 detik atau authenticated download; URL tidak disimpan persisten/log/analytics.
- **F07-FR-013:** SHA-256, ukuran, MIME magic bytes, dan dimensi object diverifikasi sebelum attachment berubah menjadi `ready`.
- **F07-FR-014:** Post entry, pembuatan metadata ter-link, upload, dan finalize masing-masing idempoten dengan `mutation_id`/attachment ID stabil; retry tidak boleh menggandakan entry, row, atau object.
- **F07-FR-015:** Hapus/relink receipt memerlukan write permission pada account parent, mencabut akses segera, membuat tombstone dan audit event, lalu job menghapus object idempoten tanpa menghapus transaksi.
- **F07-FR-016:** Hanya normalized extraction yang sudah dikoreksi/dikonfirmasi boleh disimpan dengan primary key sendiri dan parent `financial_entry_id`; attachment opsional. Raw OCR text, bounding boxes, candidate evidence, dan work image dipurge pada save/cancel atau paling lambat 24 jam.
- **F07-FR-017:** Konfirmasi harus memakai kontrak F05: `financial_entries` household-scoped, `amount_minor bigint`, canonical `entry_splits`, `lifecycle_status = 'posted'`, dan `clearing_status = 'pending'` kecuali user memilih state valid lain; hanya signed account lines posted memengaruhi saldo.
- **F07-FR-018:** UI selalu menampilkan `Hasil scan — periksa kembali`. Phase 2 tidak boleh menyebut/mengaktifkan cloud OCR; opsi Phase 5 kelak wajib tampil sebagai consent terpisah, bukan fallback.

## Aturan validasi dan bisnis

- MIME diverifikasi dari magic bytes, bukan hanya ekstensi; file SVG, executable, atau format tak dikenal ditolak.
- Original diorientasi ulang berdasarkan EXIF; metadata GPS/EXIF sensitif dibuang sebelum upload.
- Total wajib > 0 dan mengikuti limit money F05; seluruh nilai uang memakai `bigint` minor units dan boundary JSON mengirimnya sebagai string, tidak pernah floating point.
- Tanggal hasil scan tidak boleh lebih dari 50 tahun lalu atau lebih dari 24 jam ke depan; kandidat invalid tidak dipilih otomatis.
- Toleransi aritmetika maksimal 1 minor unit per komponen pembulatan, dibatasi total 5 minor units; di luar itu tampil warning.
- Maksimal 100 line items; nama item 1–160 karakter; quantity decimal positif; harga/total line integer minor units.
- Merchant maksimal 120 karakter setelah normalisasi; nomor kartu lebih dari empat digit berurutan dan pola telepon/email disensor dari OCR text kerja saat tidak dibutuhkan.
- Aggregate ledger mengikuti header `financial_entries` + `entry_splits` canonical. Receipt tidak menulis saldo langsung dan tidak boleh membuat bentuk ledger alternatif.
- Satu receipt attachment aktif hanya terkait satu transaksi dalam household yang sama; relink memerlukan konfirmasi, write permission pada account asal/tujuan yang relevan, expected version, dan audit event.
- File lokal yang dibatalkan/tidak dipertahankan dihapus segera; draft lokal creator-only dipurge pada save/cancel dan melalui TTL maksimum 24 jam.
- Server tidak menerima attachment tanpa parent. Object upload yang gagal difinalisasi dibersihkan idempoten sesuai retention tanpa pernah menjadikannya attachment lintas akses.

## Entitas dan field data

### `local_receipt_capture_sessions` (SQLCipher + encrypted file store saja)

- `id uuid`, `creator_id uuid`, `proposed_household_id uuid`, `proposed_account_id uuid`, `financial_entry_draft_id uuid`
- `extraction_ciphertext text`, `confidence_ciphertext text`, `original_file_handle text null`, `working_file_handle text`
- `keep_image boolean`, `state text`, `created_at`, `updated_at`, `expires_at` dengan TTL maksimum 24 jam
- Hanya sesi creator yang dapat membuka draft. Entitas ini tidak disinkronkan, tidak ada Storage path, dan bukan tabel Supabase.
- File persisten/pending dienkripsi AES-GCM dengan key yang dibungkus Keystore/Keychain; plaintext work file berumur sesingkat mungkin.

### `financial_entries` dan `entry_splits` (kontrak F05)

- Header `financial_entries` memakai common tenant columns + `entry_type`, `lifecycle_status`, `clearing_status`, `occurred_at`, `business_date`, `amount_minor bigint`, `currency_code`, `source = 'receipt'`, `source_metadata`, `confirmed_at`, version, dan timestamps.
- `entry_splits` memakai `line_type = 'account' | 'category'` dengan tepat satu FK account/category per line, `amount_minor bigint`, dan `currency_code`. Signed account lines pada entry `posted` adalah satu-satunya sumber saldo; category lines positif adalah sumber reporting.
- Semua account yang direferensikan wajib satu household dan lolos `can_access_account` untuk actor.

### `attachments` (Supabase, hanya sesudah konfirmasi)

- `id`, `household_id`, `financial_entry_id NOT NULL`, `uploaded_by`, `kind = 'receipt'`
- `storage_bucket`, `storage_path`, `original_filename_sanitized`, `mime_type`, `size_bytes bigint`, `sha256`, `width`, `height`, `page_count = 1`
- `status`, `uploaded_at`, `confirmed_at`, `created_at`, `updated_at`, `version`, `deleted_at`
- Composite FK menjamin attachment dan parent entry satu household. RLS metadata dan `storage.objects` mengikuti kemampuan actor membaca account yang direferensikan parent entry.

### `receipt_extractions`

- `id uuid primary key`, `household_id uuid`, `financial_entry_id uuid not null`, `attachment_id uuid null`
- `capture_mode text NOT NULL default 'on_device'`, `recognizer_version`, `schema_version`
- `merchant_name null`, `purchased_at null`, `currency_code`, `subtotal_minor bigint null`, `tax_minor bigint null`, `discount_minor bigint null`, `total_minor bigint`
- `field_confidence jsonb null`, `confirmed_by`, `confirmed_at`, `created_at`, `updated_at`, `version`
- Unique active `financial_entry_id`. Entry/attachment harus satu household; attachment bila ada wajib `kind = 'receipt'` dan menunjuk entry yang sama. RLS mengikuti read/write permission seluruh account lines parent; direct mutation ditolak.
- Hanya nilai yang telah dikoreksi/dikonfirmasi user yang persisten. `attachment_id` tetap null saat `keep_image = false`; raw OCR text, bounding boxes, dan candidate evidence tidak pernah disimpan server pada Phase 2.

### `receipt_extraction_items`

- `id uuid`, `household_id uuid`, `receipt_extraction_id uuid`, `position integer`, `description text`
- `quantity_value bigint null`, `quantity_scale smallint null`, `unit_price_minor bigint null`, `total_minor bigint`, `currency_code`, `category_id uuid null`
- `confidence numeric(5,4) null`, `confirmed_by_user boolean NOT NULL`, common version columns
- Quantity memakai `quantity_value × 10^-quantity_scale` dengan scale 0–6; unique `(receipt_extraction_id, position)`. RLS mengikuti extraction/entry parent dan item hanya ditulis bersama confirmation/koreksi berizin.

## Services, interface, dan RPC

```ts
interface ReceiptOcrAdapter {
  capabilities(): Promise<{ available: boolean; languages: string[]; engine: string; version: string }>;
  recognize(inputUri: string): Promise<{ blocks: OcrBlock[]; durationMs: number }>;
}

interface ReceiptParser {
  parse(blocks: OcrBlock[], locale: string): ReceiptExtractionDraft;
}

interface AttachmentStorageService {
  prepareUpload(input: { attachmentId: string; financialEntryId: string; mimeType: string; size: number; sha256: string; mutationId: string }): Promise<{ path: string }>;
  upload(path: string, encryptedLocalUri: string): Promise<void>;
  finalize(attachmentId: string, sha256: string, mutationId: string): Promise<void>;
  remove(attachmentId: string, expectedVersion: number, mutationId: string): Promise<void>;
}
```

- `AndroidMlKitReceiptOcrAdapter` dan `IosVisionReceiptOcrAdapter` di-compile dalam Expo development/production build; Expo Go bukan target uji fitur.
- Tidak ada `ocr` RPC, Edge Function OCR, provider payload, atau server processor pada Phase 2; adapter dan parser tidak menerima network client.
- `confirm_capture_v1(capture_kind, corrected_payload, provenance, idempotency_key)` menerima hanya payload terstruktur yang dikoreksi user, lalu menulis entry/splits, `receipt_extractions`, dan confirmed items secara atomik; RPC tidak menerima image, raw OCR, bounding boxes, atau server draft ID.
- `create_attachment_upload_v1(entry_id, metadata, idempotency_key)` hanya dipanggil sesudah confirmation sukses dan `keep_image = true`; RPC membuat attachment tertaut status pending. Saat `keep_image = false`, RPC ini tidak dipanggil dan tidak ada row/object attachment.
- Finalizer memverifikasi object, same-household parent, write permission account, hash/size/MIME/dimension, lalu mengubah attachment menjadi `ready` dan mengisi `receipt_extractions.attachment_id` untuk entry yang sama.
- `delete_attachment_v1(...)` dan relink RPC memeriksa expected version serta permission account; server job menghapus object idempoten.
- Bucket `receipts-private` tetap private. Policy `storage.objects` melakukan authorization melalui metadata parent/`can_access_account`; keamanan tidak bergantung pada tebakan prefix path.

## Offline, sinkronisasi, dan konflik

- Capture, preprocessing, OCR, parsing, koreksi, dan review berfungsi offline tanpa request jaringan.
- Sebelum konfirmasi, draft dan file hanya lokal/creator-only. Konfirmasi menulis aggregate `financial_entries` + `entry_splits` + normalized extraction dalam satu transaksi SQLCipher; upload command hanya dibuat bila `keep_image = true`.
- Saat online urutan dependency wajib: `confirm_capture_v1` membuat entry/splits/extraction atomik → bila keep-image aktif, buat metadata attachment tertaut → upload → verify → finalize/link extraction. Bila keep-image mati, sinkronisasi selesai setelah confirmation dan `attachment_id` tetap null.
- Transaksi tetap valid bila upload gagal; receipt tampil `Upload tertunda` dan dapat dicoba ulang/hapus.
- Attachment ID/path stabil mencegah object ganda pada retry. Tidak pernah ada server attachment tanpa `financial_entry_id`.
- Edit extraction di dua perangkat memakai expected version; field yang sama berubah memerlukan review. Image object immutable; mengganti foto membuat receipt version/object baru dan tombstone lama.
- Delete menang atas upload/update yang lebih lama; outbox memeriksa tombstone sebelum retry.

## Permissions, privasi, dan keamanan

- Kamera diminta just-in-time; penolakan memberi pilihan photo picker. Photo picker sistem tidak meminta akses seluruh galeri.
- OCR 100% on-device untuk Phase 2. Tidak ada cloud fallback tersembunyi dan tidak ada raw OCR/image di telemetry.
- Image berada di private app sandbox; persistent local file dienkripsi. Temporary plaintext work file dihapus setelah OCR/review atau saat aplikasi berikutnya melakukan cleanup.
- Draft yang belum terhubung creator-only dan lokal. Setelah konfirmasi, metadata/object hanya dapat diakses active household member yang lolos permission account parent; `deny` selalu menang.
- `receipt_extractions` selalu mengikuti all-account permission parent entry, termasuk saat `attachment_id IS NULL`; keberadaan extraction tidak memberi akses tambahan ke account atau household.
- Supabase Storage bucket private, metadata row dan `storage.objects` sama-sama dilindungi RLS, signed URL singkat, dan tidak ada public transform URL.
- EXIF/GPS dihapus, filename asli tidak dipakai sebagai path, dan image decoder menerima ukuran/budget memori terbatas.
- Screenshot/app switcher mengikuti F02. Share/export memakai OS share sheet hanya setelah tindakan eksplisit.
- Retention: draft lokal dipurge save/cancel/maksimal 24 jam; receipt ter-link mengikuti household sampai user berizin menghapus; deleted object dipurge maksimal 30 hari dan backup mengikuti kebijakan privasi yang dipublikasikan.

## State dan error

- `requesting_permission`, `capturing`, `preprocessing`, `recognizing`, `parsing`, `review`, `saving_local`, `upload_pending`, `uploading`, `ready`, `failed`, `deleted`.
- Gambar blur/gelap/terpotong: tampil quality warning dan retake; pengguna tetap boleh lanjut manual.
- OCR unavailable: pertahankan foto lokal dan buka form manual, tanpa mengunggah ke OCR lain.
- Out-of-memory decoder: downsample aman atau minta foto ulang, tidak crash-loop.
- Total ambigu: kosongkan field atau minta pilihan dari kandidat; tidak memilih nominal terbesar secara buta.
- Upload/hash/finalize gagal: retry tahap yang sama dengan backoff+jitter; transaction tidak digandakan.
- Object hilang: status `failed_missing_object`, tawarkan upload ulang dari lokal atau lepas attachment.
- Account permission dicabut saat upload/view: hentikan request, buang signed URL lokal, tandai outbox `permission_blocked`, dan jangan memindahkan object ke scope personal.

## Audit requirements

- Server menulis audit append-only untuk `confirm_capture`/koreksi extraction, create/finalize/delete/relink attachment, permission denied, dan perubahan retention dengan `actor_id`, `household_id`, target/correlation ID, outcome, serta reason enum.
- Audit hanya dibuat setelah ada parent entry; cancel atau draft lokal tidak membuat server audit dan tetap creator-only.
- `keep_image = false` menghasilkan audit confirmation/extraction tetapi tidak menghasilkan audit create/upload attachment.
- Metadata audit tidak boleh memuat image, OCR text, merchant, item, nominal, hash, storage path, signed URL, filename asli, atau confidence.
- Akses audit mengikuti household/account permission; insert hanya melalui RPC/server dan update/delete ditolak. Security test memverifikasi audit dibuat atomik bersama mutasi.

## Analytics tanpa payload sensitif

- `receipt_scan_started { source, platform }`
- `receipt_quality_result { quality_class }`
- `receipt_ocr_completed { engine, duration_bucket_ms, block_count_bucket }`
- `receipt_review_completed { corrected_field_count, item_count_bucket, saved_image }`
- `receipt_upload_result { result, retry_count_bucket, size_bucket }`
- `receipt_deleted { age_bucket_days }`

Tidak mengirim gambar, OCR text, merchant, item, nominal, tanggal, lokasi, hash, storage path, receipt/transaction ID, atau confidence per field.

## Acceptance criteria (Given–When–Then)

1. **Given** perangkat offline atau traffic diintersep, **When** struk dipotret, **Then** OCR/parser/review berjalan on-device tanpa request yang membawa image/text dan tanpa mencoba fallback cloud.
2. **Given** hasil total confidence rendah, **When** review tampil, **Then** field disorot dan transaksi tidak disimpan sebelum pengguna mengonfirmasi/memperbaiki.
3. **Given** pengguna batal sebelum konfirmasi, **When** keluar flow, **Then** tidak ada entry/attachment/object/upload session server dan seluruh temporary image serta OCR draft dipurge.
4. **Given** `Simpan gambar struk` dimatikan, **When** konfirmasi selesai, **Then** canonical entry/splits dan satu normalized extraction tersimpan tepat sekali dengan `financial_entry_id` terisi/`attachment_id = NULL`, tanpa row/metadata/object attachment, lalu seluruh gambar lokal dipurge.
5. **Given** `Simpan gambar struk` aktif dan konfirmasi terjadi offline, **When** koneksi kembali atau upload di-retry, **Then** entry/splits/extraction dibuat atomik lebih dahulu, satu attachment tertaut dibuat, object/hash difinalisasi tepat sekali, `attachment_id` di-link ke extraction, dan transaksi tidak digandakan.
6. **Given** actor bukan anggota household atau tidak dapat mengakses account parent, **When** membaca metadata/object/signed URL, **Then** database dan Storage RLS menolak; anggota yang berizin dapat mengakses setelah link final.
7. **Given** audit/analytics/crash capture aktif, **When** flow selesai, gagal, dihapus, atau ditolak, **Then** payload hanya berisi allowlist enum/count/version dan tidak berisi image, OCR text, financial values, path, hash, atau signed URL.

## Test matrix

| Area | Kasus minimum | Jenis |
|---|---|---|
| Capture/import | permission allow/deny, HEIC/JPEG/PNG, rotate, oversized, corrupt | Perangkat/integrasi |
| OCR adapter | Android ML Kit, iOS Vision, unavailable, language variation | Golden image/device |
| Parser | format Indonesia/global, diskon/pajak/service, ambiguous totals, no item | Golden fixture/property |
| Privacy | no network during OCR, hidden-fallback assertion, EXIF removal, save/cancel/24h cleanup | Network/security test |
| Storage/RLS | household membership, account allow/deny, private policy, signed URL expiry, hash mismatch | Integrasi Supabase |
| Offline | restart each stage, keep-image off, dependency-ordered upload retry, transaction-first recovery | SQLCipher/E2E |
| Conflict/delete | extraction conflict, replace image, delete during upload | Integrasi |
| Audit | mutation atomicity, permission denied, metadata allowlist/redaction | SQL/security contract |
| Aksesibilitas | review focus, confidence non-color cue, zoom, screen reader | Manual + automated |

## Implementasi bertahap dan dependensi

1. **Slice 1 — Adapter spike produksi:** Expo dev build, ML Kit/Vision adapter contract, capability checks, golden image suite, no-network assertion.
2. **Slice 2 — Capture/preprocess:** camera/photo picker, size/MIME guard, crop/rotate/quality, encrypted local file lifecycle.
3. **Slice 3 — Parse/review:** deterministic parser, arithmetic validation, field confidence, correction UI, F04 suggestion, F05 confirmation.
4. **Slice 4 — Private upload:** post-entry dependency, linked-only metadata, household/account RLS, finalize/delete RPC, hash, signed view, cleanup.
5. **Slice 5 — Offline/hardening:** resumable state machine, fault injection, memory/performance, accessibility, privacy/analytics audit.

Dependensi: F01 auth/key/RLS, F02 locale/timezone, F03 account, F04 category/rule, F05 transaction review/post. Build native diperlukan untuk OCR; Expo Go tidak menjadi acceptance environment.

## Rollout dan kill switch

- Remote config: `receipt_scan_enabled`, `receipt_storage_enabled`, `receipt_items_enabled`, `receipt_ocr_android_enabled`, `receipt_ocr_ios_enabled`.
- OCR dirilis per platform ke internal corpus/perangkat, lalu 5%, 25%, 100%; storage dapat dirilis terpisah.
- Monitor crash-free scan, OCR duration, correction count, upload retry, orphan count, dan permission conversion tanpa receipt content.
- Kill switch OCR membuka photo/manual entry dan tidak mengirim ke cloud. Kill switch storage mempertahankan draft/transaksi tetapi mematikan upload baru.
- Adapter version dipin; rollback mengganti implementasi di balik interface tanpa migrasi data extraction.
- Tidak ada remote flag Phase 2 yang dapat mengaktifkan endpoint OCR. Cloud OCR Phase 5, bila disetujui kelak, memakai feature ID/consent/vendor/DPA/retention/kill switch terpisah dan tidak menjadi fallback.

## Referensi implementasi terverifikasi

- [ML Kit Text Recognition Android](https://developers.google.com/ml-kit/vision/text-recognition/v2/android) — pilih model bundled untuk kesiapan lokal tanpa mengirim gambar ke OCR server.
- [Apple Vision text recognition](https://developer.apple.com/documentation/vision/recognizing-text-in-images) — `VNRecognizeTextRequest` untuk OCR image lokal.
- [Supabase private Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals) dan [Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — bucket private, download/upload diotorisasi melalui RLS; signed URL tetap dibuat hanya setelah authorization.
