# F08 — Pencatatan dengan Perintah Suara

## Status, fase, dan prioritas

- Status: Siap diimplementasikan
- Fase: Phase 2
- Prioritas: Tinggi untuk input cepat dan aksesibilitas
- Arsitektur terkunci: speech recognition dan parser 100% on-device/local pada Phase 2, draft SQLCipher creator-only, tanpa raw-audio persistence, Supabase transcript, voice staging, atau server processor

## Outcome dan Jobs To Be Done

Pengguna dapat mengucapkan pemasukan atau pengeluaran dalam Bahasa Indonesia, melihat hasil terstruktur, memperbaikinya, dan baru kemudian menyimpan transaksi.

**JTBD:** Ketika sedang bergerak atau tidak ingin mengetik, saya ingin berkata seperti “keluar lima puluh ribu buat makan dari GoPay kemarin” agar draft terisi cepat tanpa kehilangan kontrol atau privasi.

## Scope

- Push-to-talk/tap-to-stop untuk satu perintah singkat Bahasa Indonesia.
- Speech recognition on-device melalui adapter: Apple Speech dengan on-device requirement dan Android on-device SpeechRecognizer bila tersedia.
- Parser deterministik Indonesia untuk direction, amount, account, category, merchant/note, dan relative date.
- Resolusi terhadap akun/kategori/tag lokal dengan normalisasi dan disambiguasi.
- Transcript sementara terenkripsi lokal, live feedback, hasil parse, review/edit, dan explicit confirmation melalui F05.
- Operasi offline ketika model speech on-device tersedia.
- Permission, capability detection, error recovery, dan aksesibilitas.
- Raw audio tidak pernah direkam ke file, outbox, backup, analytics, atau Supabase pada Phase 2.

## Non-scope

- Voice assistant percakapan bebas, LLM/cloud transcription, server STT processor, `audio_path`, bucket voice staging, wake word/background listening, speaker identification, atau voice biometrics pada Phase 2.
- Menyimpan/mengeksekusi transaksi tanpa review manusia.
- Transfer, split kompleks, penghapusan, pembayaran, atau perubahan akun melalui suara pada Phase 2.
- Dukungan bahasa selain `id-ID` berada setelah Phase 2; arsitektur adapter/parser tetap versioned.
- Cloud STT opsional hanya dapat hadir sebagai fitur Phase 5 terpisah: opt-in eksplisit, disclosure vendor/region, DPA/DPIA, retention/deletion, transcript-use policy, consent versioning, dan kill switch sendiri. Ia bukan fallback ekuivalen ketika recognizer lokal tidak tersedia.

## Alur UX

1. Pengguna menekan ikon mikrofon dari quick add. Capability check menjelaskan apakah mode on-device tersedia sebelum permission diminta.
2. Izin mikrofon diminta just-in-time. Bila ditolak/tidak tersedia, pengguna diarahkan ke form manual tanpa kehilangan input.
3. UI menampilkan contoh singkat dan indikator listening non-mengganggu; pengguna bicara lalu tap stop atau sistem berhenti setelah silence timeout.
4. Transcript parsial tampil dari buffer lokal sebagai teks untuk aksesibilitas, tetapi belum membuat transaksi dan tidak pernah dikirim ke server.
5. Parser deterministik lokal mengekstrak field dan mencocokkan akun/kategori. Field pasti terisi; field ambigu menampilkan pilihan.
6. Layar review F05 berlabel `Dibuat dari suara` menampilkan nominal, tipe, akun, kategori, waktu, dan catatan. Pengguna wajib menekan `Simpan transaksi`.
7. Setelah save/cancel, buffer audio dilepas. Transcript terenkripsi dipurge setelah aggregate lokal berhasil ditulis, saat cancel, atau paling lambat 24 jam; hanya structured transaction dan parser version yang tersinkron.

## Functional requirements

- **F08-FR-001:** Aplikasi harus memeriksa dukungan true on-device recognition untuk locale sebelum memulai; flag “prefer offline” atau asumsi platform bukan jaminan.
- **F08-FR-002:** iOS hanya memulai bila `supportsOnDeviceRecognition = true` dan request menetapkan `requiresOnDeviceRecognition = true`; Android memeriksa `isOnDeviceRecognitionAvailable` lalu memakai `createOnDeviceSpeechRecognizer`.
- **F08-FR-003:** Jika on-device tidak tersedia/gagal capability check, mic tidak dimulai dan fitur menawarkan input teks/manual; tidak ada cloud fallback tersembunyi, server STT, atau upload audio/transcript.
- **F08-FR-004:** Mikrofon aktif hanya setelah tindakan pengguna dan maksimal 30 detik per command; selalu ada tombol stop/cancel yang jelas.
- **F08-FR-005:** Implementasi tidak pernah menulis raw PCM/compressed audio ke disk/database/outbox; buffer memori dilepas dan audio focus ditutup pada stop, cancel, error, timeout, telepon, atau background.
- **F08-FR-006:** Parser v1 mendukung expense cues (`keluar`, `pengeluaran`, `beli`, `bayar`) dan income cues (`masuk`, `pemasukan`, `terima`, `gaji`).
- **F08-FR-007:** Parser nominal mendukung digit/format rupiah dan kata bilangan Indonesia: `ribu`, `rb`, `juta`, `jt`, `miliar`, serta desimal seperti `satu koma lima juta`.
- **F08-FR-008:** Parser tanggal mendukung `hari ini`, `kemarin`, `tadi pagi/siang/sore/malam`, tanggal eksplisit, dan nama hari terdekat berdasarkan timezone F02.
- **F08-FR-009:** Resolusi akun mengenali pola `dari [akun]` untuk expense dan `ke [akun]` untuk income; exact normalized alias menang atas fuzzy match.
- **F08-FR-010:** Resolusi kategori memakai nama/alias F04 dan rule engine; kecocokan ambigu tidak dipilih otomatis.
- **F08-FR-011:** Minimal amount dan direction harus jelas sebelum lanjut; account/category yang hilang memakai default hanya jika pengguna pernah memilih default, review menandainya, dan actor masih mempunyai write permission ke account.
- **F08-FR-012:** Transcript dan parse result harus dapat diedit melalui form biasa sebelum save; transcript hanya berada dalam draft lokal SQLCipher creator-only.
- **F08-FR-013:** Parser tidak mengeksekusi intent destruktif, transfer, atau perubahan pengaturan; intent di luar allowlist diarahkan ke input manual.
- **F08-FR-014:** Transaction yang disimpan memakai `source = 'voice'` dan `input_parser_version` dalam kontrak canonical `financial_entries`/`entry_splits` F05; tidak ada kolom audio atau raw transcript server.
- **F08-FR-015:** Session interruption harus berhenti aman; transcript parsial hanya boleh berada pada draft lokal terenkripsi sampai save/cancel dan selalu dipurge paling lambat 24 jam.
- **F08-FR-016:** UI menyediakan haptic/sound cue opsional saat mulai/berhenti yang menghormati silent/accessibility settings.
- **F08-FR-017:** Semua hasil suara wajib melewati review/confirmation F05; save membuat `lifecycle_status = 'posted'` dan `clearing_status = 'pending'` kecuali user memilih state clearing valid lain, tanpa mode auto-post.
- **F08-FR-018:** Seluruh recognition/parsing dapat diuji melalui fake adapter/corpus tanpa mikrofon; test wajib membuktikan tidak ada server processor, voice-staging request, audio file, atau Supabase transcript pada Phase 2.

## Aturan validasi dan bisnis

- Locale awal `id-ID`; parser melakukan Unicode NFKC, lowercase, trim, collapse whitespace, dan normalisasi variasi `rupiah/Rp`.
- Satu command hanya boleh menghasilkan satu expense atau income. Dua direction atau dua amount utama yang sama kuat menghasilkan ambiguity.
- Amount > 0 dan mengikuti batas global F05; nilai uang memakai `bigint` minor units, boundary JSON berupa string, dan perkalian kata bilangan tidak memakai floating point.
- `1,5 juta` → 1.500.000; `1.500` pada locale Indonesia → 1.500; input yang dapat berarti 1,5 vs 1.500 harus ditandai untuk review.
- Relative date dihitung saat utterance selesai menggunakan timezone profile, lalu dikonfirmasi sebagai `occurred_at` UTC dan immutable `business_date`; timezone tetap konteks lokal, bukan kolom ledger tambahan.
- Nama hari tanpa kata `depan` memilih kejadian paling baru yang tidak lebih dari enam hari lalu; UI selalu menampilkan tanggal hasil untuk konfirmasi.
- Exact alias account/category harus unik. Jika beberapa objek memiliki normalized alias sama, pengguna wajib memilih.
- Fuzzy match hanya menyarankan bila skor melewati threshold versi parser dan runner-up berjarak aman; threshold tidak menyebabkan auto-save.
- Merchant/note hasil sisa maksimal 120/1.000 karakter dan disanitasi sebagai teks.
- Structured save mengikuti header `financial_entries` household-scoped dan `entry_splits` canonical; hanya signed account lines pada entry `posted` memengaruhi saldo, sedangkan category lines positif menjadi sumber reporting.
- Transcript sementara dipurge saat aggregate lokal berhasil disimpan, flow dibatalkan, logout/account switch, atau TTL maksimum 24 jam; raw audio tidak memiliki retention karena tidak pernah ditulis.

## Entitas dan field data

### `local_voice_capture_sessions` (SQLCipher saja)

- `id uuid`, `creator_id uuid`, `proposed_household_id uuid`, `proposed_account_id uuid null`, `created_at`, `updated_at`, `expires_at`
- `transcript_ciphertext text null`, `parse_result_ciphertext text`, `ambiguities_ciphertext text`, `parser_version text`
- `recognizer_engine text`, `recognizer_version text`, `state text`; tidak ada `audio_path` atau file handle audio
- Entitas ini creator-only, tidak disinkronkan, tidak masuk backup cloud, dan dipurge pada save/cancel atau maksimal 24 jam.
- Phase 2 tidak memiliki tabel Supabase `voice_capture_sessions`, bucket voice staging, job/server processor, raw-audio row, atau transcript row.

### `entity_aliases`

- `id uuid`, `household_id uuid`, `created_by uuid`, `entity_type text` — `account` atau `category`
- `entity_id uuid`, `alias text`, `normalized_alias text`, `source text`
- `created_at`, `updated_at`, `version bigint`
- Alias hanya disinkronkan setelah user memilih target dan menyetujui `Simpan sebagai alias`. RLS creator-only untuk preference ini, sementara target account wajib satu household dan lolos `can_access_account`; tidak ada transcript/evidence parser di tabel.

### `financial_entries` (ekstensi F05)

- Header household-scoped memakai `entry_type` canonical, `lifecycle_status`, `clearing_status`, `amount_minor bigint`, `currency_code`, `occurred_at`, `source = 'voice'`, `source_metadata` minimum (`capture_mode='on_device'`, engine/parser version, confidence bucket), actor, version, dan timestamps.
- `entry_splits` berisi account/category lines canonical; semua linked account diperiksa melalui household membership + `can_access_account`. Signed account lines posted adalah satu-satunya sumber saldo.
- Tidak ada kolom audio, raw transcript, transcript hash, token/kata, atau provider payload.

## Services, interface, dan RPC

```ts
interface SpeechRecognitionAdapter {
  capabilities(locale: string): Promise<{ onDevice: boolean; supportsPartial: boolean; engine: string; version: string }>;
  start(input: { locale: 'id-ID'; requireOnDevice: true; maxDurationMs: 30000 }): AsyncIterable<SpeechEvent>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
}

interface IndonesianFinanceParser {
  parse(transcript: string, context: ParserContext): {
    fields: Partial<ManualEntryDraft>;
    evidence: Record<string, string[]>;
    ambiguities: ParseAmbiguity[];
    parserVersion: string;
  };
}
```

- `IosOnDeviceSpeechAdapter` membungkus Apple Speech/SFSpeechRecognizer dengan on-device requirement; `AndroidOnDeviceSpeechAdapter` memakai API recognizer on-device ketika tersedia.
- Adapter tidak mengekspos audio bytes ke analytics/domain/network layer. Fake adapter memberi event fixture untuk unit/E2E test.
- `IndonesianNumberParser`, `RelativeDateParser`, dan `EntityResolver` adalah modul TypeScript murni, terurut: normalisasi → intent/direction → amount → date → entity aliases → rule suggestion → ambiguity.
- Penyimpanan hanya mengirim structured `ManualEntryDraft` ke `post_manual_entry_v1` F05; tidak ada RPC voice/STT, audio upload, transcript upload, atau server parse endpoint.
- RPC `upsert_entity_alias_v1(p_household_id, p_entity_type, p_entity_id, p_alias, p_expected_version, p_mutation_id)` memvalidasi active membership, creator, target account permission, dan normalized uniqueness.

## Offline, sinkronisasi, dan konflik

- Bila model/engine on-device tersedia, recognition, parser, alias resolution, dan review berjalan tanpa jaringan.
- Voice draft disimpan terenkripsi lokal hanya setelah transcript final/partial yang berguna; tidak ada file audio, transcript, atau parse evidence di outbox.
- Saat user mengonfirmasi, structured draft mengikuti jalur offline/idempotency F05. Transcript dipurge setelah aggregate canonical `financial_entries` + `entry_splits` lokal berhasil ditulis.
- Alias baru dapat masuk outbox; transaksi menyimpan entity ID terpilih sehingga perubahan alias tidak mengubah histori.
- Bila account/category diarsipkan atau permission account dicabut sebelum sync, transaksi kembali ke review dependency; transcript tidak dipulihkan karena structured fields tetap ada.
- Konflik transaksi mengikuti F05. Parser version/evidence bersifat metadata input dan tidak digunakan untuk merge nilai finansial.
- Cleanup saat startup/logout/account switch menghapus voice drafts lewat `expires_at` dan memverifikasi tidak ada orphan audio file.

## Permissions, privasi, dan keamanan

- Permission mikrofon diminta tepat saat tap mic; aplikasi tidak meminta background audio dan tidak listening saat background.
- On-device requirement diverifikasi dari capability API. Jika platform/locale tidak menjaminnya, fitur tidak mulai dan tidak beralih ke cloud.
- Raw audio hanya melewati memory buffer/framework speech native, tidak disimpan aplikasi. Kebijakan privasi menjelaskan komponen OS tanpa menyiratkan izin cloud fallback.
- Transcript sementara berada di SQLCipher creator-only, tidak di Supabase, Storage, outbox, log, crash report, analytics, clipboard, push notification, atau audit.
- Structured transaction yang dikonfirmasi mengikuti active household membership dan account permission F05; akses tidak berbasis `user_id` ownership.
- Screen reader mengumumkan state listening/processing tanpa membacakan nominal bila mask amounts aktif.
- Audio focus dilepas pada stop/cancel/error; indikator mikrofon sistem menjadi kontrol tambahan, bukan satu-satunya indikator.

## State dan error

- `checking_capability`, `permission_required`, `ready`, `listening`, `processing`, `needs_clarification`, `review`, `saving`, `cancelled`, `unavailable`, `error`.
- Permission denied: jelaskan cara mengaktifkan dari Settings dan tawarkan manual entry.
- On-device model unavailable: tampilkan pesan spesifik serta manual/text input; tidak download model tanpa tindakan/izin pengguna.
- No speech/silence: satu retry dengan panduan; tidak membuat draft kosong.
- Audio interrupted/backgrounded: stop, tandai interrupted, dan izinkan melanjutkan dari transcript parsial.
- Amount/direction ambigu: fokus pada field dan pilihan kandidat; jangan menebak.
- Account/category tidak ditemukan: buka picker dan opsional `Simpan sebagai alias` setelah user memilih.
- Parser crash/unknown token: transcript tetap dapat dipindahkan ke catatan manual selama sesi, lalu dihapus sesuai retention.
- Permission account berubah saat review/save: hentikan save, pertahankan structured fields lokal untuk pemilihan account lain, tetapi purge transcript sesuai lifecycle/TTL.

## Audit requirements

- Server hanya menulis audit setelah save structured entry F05 atau mutasi alias yang disetujui; start/listen/cancel/local parse tidak membuat server audit.
- Audit entry/alias memuat actor, household, target/correlation ID, outcome, parser version allowlisted, dan reason enum. Tidak boleh memuat audio, transcript, token/kata, parse evidence, nominal, merchant/note, nama alias, atau confidence.
- Audit append-only dibuat atomik oleh RPC dan aksesnya mengikuti household/account permission. Percobaan save lintas account mencatat denial ter-redact tanpa menyimpan input suara.

## Analytics tanpa payload sensitif

- `voice_entry_started { platform, on_device_available }`
- `voice_permission_result { result }`
- `voice_recognition_result { result, duration_bucket_s, engine }`
- `voice_parse_result { required_fields_found, ambiguity_count_bucket, parser_version }`
- `voice_review_completed { corrected_field_count, saved }`
- `voice_entry_fallback { reason_class, destination: 'manual' }`

Tidak mengirim audio, transcript, token/kata, amount/bucket nominal, merchant/note, tanggal, currency, account/category/tag/entry ID, atau nama alias.

## Acceptance criteria (Given–When–Then)

1. **Given** on-device recognizer tersedia, **When** pengguna berkata “keluar lima puluh ribu buat makan dari GoPay kemarin”, **Then** draft berisi expense 50.000, kandidat kategori makan, akun GoPay, tanggal kemarin, dan belum tersimpan.
2. **Given** pengguna belum menekan `Simpan transaksi`, **When** meninggalkan review, **Then** ledger tidak memiliki posting dari command itu dan transcript lokal terenkripsi dipurge saat cancel atau maksimal 24 jam.
3. **Given** perangkat tidak memiliki recognizer on-device `id-ID`, **When** mic ditekan, **Then** aplikasi tidak mengirim audio ke cloud dan menawarkan form manual.
4. **Given** dua akun bernama/alias serupa, **When** parser menyelesaikan entity, **Then** user diminta memilih dan tidak ada akun dipilih otomatis.
5. **Given** aplikasi masuk background saat listening, **When** lifecycle event terjadi, **Then** mikrofon berhenti, audio focus dilepas, dan tidak ada raw audio file.
6. **Given** transaksi suara dikonfirmasi offline oleh actor yang berizin, **When** koneksi kembali, **Then** canonical entry/splits tersinkron sekali melalui F05, akses mengikuti household/account permission, dan transcript/audio tidak dikirim.
7. **Given** analytics/crash/audit capture aktif, **When** flow selesai/gagal/ditolak, **Then** payload hanya berisi enum/count/version allowlist dan tidak ada audio, transcript, token, alias, nominal, merchant/note, atau entity ID analytics.

## Test matrix

| Area | Kasus minimum | Jenis |
|---|---|---|
| Adapter iOS | supported/unsupported locale, partial/final, interruption, requireOnDevice | Perangkat nyata |
| Adapter Android | on-device available/unavailable, permission, audio focus | Perangkat nyata |
| Number parser | ribu/juta/miliar, digit locale, koma, batas bigint, ambiguity | Golden/property |
| Date parser | hari ini/kemarin, daypart, weekday, DST/timezone | Unit |
| Entity resolver | exact alias, fuzzy unique, collision, archived entity | Golden fixture |
| End-to-end | sample expense/income, correction, cancel, offline save | E2E fake + device |
| Privacy | network blocked, no server STT/staging, no audio file, save/cancel/24h transcript cleanup | Security test |
| Ledger/RLS | canonical entry/splits, lifecycle/clearing, household membership, account allow/deny | SQL/integrasi |
| Audit | save/alias atomicity, denial event, metadata allowlist/redaction | SQL/security contract |
| Accessibility | TalkBack/VoiceOver announcements, haptic/silent, masked amounts | Manual |

Corpus parser minimum mencakup variasi informal Indonesia seperti `50rb`, `dua ratus lima puluh ribu`, `1,5 jt`, `beli bensin 100 ribu`, dan `gaji masuk dua juta ke BCA hari ini`, termasuk fixture yang wajib menghasilkan ambiguity.

## Implementasi bertahap dan dependensi

1. **Slice 1 — Parser deterministic:** corpus versioned, normalizer, bigint number parser, direction/date parser, entity resolver, property/golden tests.
2. **Slice 2 — Native adapter:** Expo development build, capability gate nyata Android/iOS, permission/audio lifecycle, fake adapter.
3. **Slice 3 — UX:** push-to-talk, partial transcript, ambiguity UI, review bridge ke F05, accessibility.
4. **Slice 4 — Offline/privacy:** encrypted creator-only draft, save/cancel/24h cleanup, no-network/no-audio-file/no-Supabase-transcript assertions, permission-safe alias outbox.
5. **Slice 5 — Hardening/rollout:** device matrix, noisy-environment testing, parser metrics tanpa payload, crash/fallback handling.

Dependensi: F01 secure storage/SQLCipher, F02 locale/timezone/privacy, F03 accounts, F04 category/rules/aliases, F05 review dan post transaction. Native speech membutuhkan development/production build; Expo Go bukan acceptance environment.

## Rollout dan kill switch

- Remote config: `voice_entry_enabled`, `voice_entry_ios_enabled`, `voice_entry_android_enabled`, `voice_alias_learning_enabled`, `voice_parser_version`.
- Rollout per platform/model availability: internal → 5% → 25% → 100%, hanya pada device yang capability check-nya lolos.
- Monitor permission conversion, recognition result class, ambiguity/correction count, fallback, duration, dan crash-free flow tanpa konten suara.
- Kill switch menonaktifkan start microphone dan mengarahkan ke manual entry; draft terstruktur yang sudah ada tetap dapat direview.
- Parser version dipin dan dapat di-rollback melalui bundle/remote selection yang sudah diunduh; rule baru tidak mengubah transaksi yang telah disimpan.
- Tidak ada remote flag Phase 2 yang dapat menyalakan cloud STT/server processor. Cloud STT Phase 5, bila disetujui kelak, memakai feature ID, consent, vendor/DPA, retention, disclosure, dan kill switch terpisah.

## Referensi implementasi terverifikasi

- [Apple `requiresOnDeviceRecognition`](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition) dan [`supportsOnDeviceRecognition`](https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition) — request hanya dimulai ketika on-device benar-benar didukung.
- [Android `SpeechRecognizer`](https://developer.android.com/reference/android/speech/SpeechRecognizer) — periksa `isOnDeviceRecognitionAvailable` sebelum `createOnDeviceSpeechRecognizer`.
