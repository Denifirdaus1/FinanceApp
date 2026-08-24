# Analytics, Measurement, dan Experimentation

**Produk:** FinanceApp  
**Cakupan:** iOS, Android 10+ (API 29+), Supabase backend, offline sync, bank/e-wallet sync, dan OTA update  
**Model:** first-party, privacy-minimized, consent-aware  
**Status:** Kontrak pengukuran siap implementasi  

## 1. Tujuan Pengukuran

Analytics menjawab lima pertanyaan tanpa mengumpulkan isi keuangan pengguna:

1. Apakah pengguna mencapai nilai pertama dengan cepat?
2. Metode pencatatan mana yang berhasil dan dapat dipercaya?
3. Apakah pengguna kembali untuk memahami dan merencanakan keuangannya?
4. Apakah sync, bank connection, keamanan, dan OTA update berjalan sehat?
5. Apakah perubahan produk meningkatkan hasil tanpa merusak privasi, aksesibilitas, atau reliabilitas?

Analytics **bukan** sumber kebenaran saldo, transaksi, atau laporan finansial. Metrik produk dihitung dari event terpisah yang telah diminimalkan; metrik ledger hanya dihitung di domain transaksi untuk kebutuhan pengguna dan tidak disalin ke payload analytics.

### 1.1 Roadmap kanonis pengukuran

| Fase | Scope yang mulai diukur | Exit measurement gate |
|---|---|---|
| Phase 0 — Foundation | Schema registry, consent enforcement, redaction, safe observability | Fixture sensitif 100% ditolak; dashboard memakai data sintetis/internal |
| Phase 1 — Core Ledger | F01–F06; F16/F18/F24 dasar | Onboarding, activation, manual save, sync integrity, dan security gate terukur |
| Phase 2 — Capture/Daily | F07–F09; F11 dasar; F13 inti; notifikasi F19 | Receipt/voice quality, daily summary, D30 beta, dan crash-free beta lulus |
| Phase 3 — Planning | F10–F15; F16 lengkap | Formula/report drill-down, budget/goal/recurring/debt/forecast adoption terukur |
| Phase 4 — Collaboration/Global | F17/F20/F23; hardening F18/F24; widget/shortcut F19 | Isolation household, localization, sync/OTA GA, dan crash-free GA lulus |
| Phase 5 — Optional AI/Bank | F21 dan F22 | AI dan connector mempunyai consent, safety, reliability, legal, serta partner gate independen |

Label fase di semua dashboard, experiment report, dan release annotation harus memakai nama di atas; jangan memakai alias P0/P1/MVP/V1 yang mengubah makna.

## 2. Target Produk dan Definisi

Semua target dievaluasi mingguan menggunakan rolling window 28 hari kecuali window disebutkan berbeda. Akun internal, automation, QA, dan data yang gagal validasi schema dikeluarkan dari numerator dan denominator. Metrik perilaku produk memakai **cohort product-consented**: consent product analytics harus aktif ketika pengguna memasuki denominator. Pengguna yang kemudian mencabut consent tetap dihitung berdasarkan event yang telah sah diterima sampai pencabutan, tetapi tidak ada event lanjutan; bila pengguna meminta penghapusan, seluruh kontribusinya dihapus dari numerator dan denominator. Metrik operasional essential memakai seluruh objek/perangkat eligible. Metrik crash memakai session dengan crash diagnostics consent.

| Metrik | Definisi numerator | Denominator dan window | Target |
|---|---|---|---:|
| Onboarding completion | Pengguna unik product-consented dengan `onboarding_completed` | Pengguna unik product-consented ketika `onboarding_started`; selesai ≤24 jam sejak start | ≥70% |
| Activation 24 jam | Pengguna product-consented yang selesai onboarding, mempunyai ≥1 `account_created`, menyimpan ≥1 transaksi posted, lalu membuka ringkasan Beranda | Pengguna unik baru dengan `auth_completed.is_new_user=true` dan consent aktif sebelum `onboarding_started`; semua syarat harus terjadi ≤24 jam dari auth | ≥60% |
| WAU/MAU | Pengguna product-consented dengan ≥1 meaningful action dalam 7 hari terakhir | Pengguna product-consented dengan ≥1 meaningful action dalam 30 hari terakhir pada hari snapshot | ≥45% |
| D30 retained | Pengguna product-consented cohort yang melakukan meaningful action pada hari ke-27 sampai ke-33 | Pengguna product-consented yang teraktivasi pada hari 0; cohort memakai tanggal aktivasi, bukan install | ≥25% |
| Manual submit success | `transaction_created` atau durable local commit setelah submit manual | `transaction_submit_attempted.method=manual` milik cohort product-consented dalam session capture yang sama, window 5 menit | ≥97% |
| Receipt usable extraction | Receipt product-consented mencapai review dengan field wajib terdeteksi dan tidak berakhir processing failure | `capture_processing_started.method=receipt` milik cohort product-consented setelah gambar lolos quality gate, window 2 menit | ≥85% |
| Voice usable extraction | Voice product-consented mencapai review dengan field wajib terdeteksi dan tidak berakhir processing failure | `capture_processing_started.method=voice` milik cohort product-consented setelah `voice_recording_stopped.stop_reason` bernilai `user` atau `limit`, window 1 menit | ≥88% |
| Sync recovery SLO | Mutation lokal menerima ack server ≤5 menit sejak `network_restored` pertama setelah mutation dibuat | Semua mutation valid yang menunggu ketika koneksi pulih; diukur rolling 7 hari | ≥99,5% |
| Crash-free sessions beta | Session tanpa fatal crash/native fatal/ANR | Seluruh session beta valid dengan crash diagnostics consent, rolling 7 hari | ≥99,7% |
| Crash-free sessions GA | Session tanpa fatal crash/native fatal/ANR | Seluruh session production valid dengan crash diagnostics consent, rolling 7 hari | ≥99,9% |
| OTA adoption 24 jam | Perangkat eligible aktif menjalankan update target sebagai `app_ready` | Perangkat dengan runtime/channel kompatibel yang membuka app dalam 24 jam setelah publish | ≥80% |
| OTA rollback rate | Perangkat mengalami rollback otomatis/manual dari update target | Perangkat unik yang berhasil menerapkan update target dalam 7 hari | <0,5% |

### 2.1 Meaningful action

Salah satu dari: membuat/mengubah transaksi; menyelesaikan review; membuka dashboard setelah ada data; membuka laporan; membuat/memperbarui anggaran, target, tagihan, utang, atau forecast; menyelesaikan sync/import; menerima/menyelesaikan aktivitas rumah tangga. `app_opened`, notification impression, consent screen, dan login tanpa aktivitas lanjutan tidak dihitung.

### 2.2 Definisi field wajib capture

`required_fields_complete=true` berarti parser menghasilkan jenis transaksi, nominal valid, tanggal, dan kandidat rekening atau fallback rekening default. Nilai field tidak dikirim ke analytics; hanya boolean kelengkapan. Keberhasilan teknis dan keberhasilan pengguna disajikan terpisah melalui metrik draft-to-save.

### 2.3 Coverage consent

Setiap dashboard perilaku menampilkan `measurement_coverage = active installation-day product-consented / active installation-day eligible`. Penghitung essential menerima `app_ready` yang hanya membawa installation ID pseudonim, platform, release, dan state consent; job harian langsung mengagregasi lalu menghapus identifier penghitung setelah 24 jam. Ia tidak merekam layar, fitur, atau perilaku finansial. Hasil diberi label **directional** dan tidak boleh digeneralisasi ke seluruh pengguna bila coverage <30% atau selisih coverage iOS vs Android >15 percentage point. Target PRD di tabel di atas berlaku pada cohort product-consented; health/SLO sync dan OTA berlaku pada seluruh populasi eligible melalui event essential yang diminimalkan. Crash-free dibandingkan pula dengan agregat App Store/Play Console pada panel terpisah untuk mendeteksi selection bias.

## 3. Prinsip Privasi dan Consent

### 3.1 Kategori consent

| Kategori | Default | Tujuan | Dampak bila mati |
|---|---|---|---|
| Essential operations | Aktif dan wajib | Auth, keamanan, idempotency, sync health, lifecycle/release health minimum, audit perubahan sensitif | Layanan inti tidak dapat berjalan tanpa jejak operasional minimum |
| Product analytics | Mati sampai pengguna memilih | Funnel, adopsi fitur, cohort, UX quality | Produk tetap berfungsi penuh |
| Crash diagnostics | Mati sampai pengguna memilih | Stack yang disanitasi, device class, app/build/update version | Error tetap tampil; laporan teknis tidak dikirim |
| AI personalization | Mati sampai pengguna memilih | Personalisasi insight di domain produk, bukan analytics umum | AI memakai konteks sesi yang diizinkan tanpa riwayat personalisasi |
| Marketing | Mati | Tidak digunakan pada baseline produk | Tidak ada perubahan fungsi |

Consent ditampilkan dengan pilihan setara **Izinkan** dan **Nanti**, tanpa pre-checked box, countdown, atau blocking access. Pengguna dapat mengubah setiap kategori di F24; perubahan berlaku untuk event berikutnya dan menghapus raw product analytics yang masih tertaut atas permintaan penghapusan.

### 3.2 Data yang dilarang dalam analytics

Jangan pernah mengirim nilai atau turunan yang dapat merekonstruksi:

- nominal, saldo, limit, target uang, cicilan, bunga, kurs yang dipakai, atau net worth;
- merchant, sumber pemasukan, catatan, tag buatan pengguna, nama rekening, nomor rekening/kartu;
- foto/teks struk, item belanja, hasil OCR mentah, hash file yang dapat dipakai lintas sistem;
- audio, transkrip, prompt, response AI, search query, atau correction value;
- email, nama, Google subject ID, daftar kontak, alamat, lokasi presisi, IP tersimpan, token, atau credential;
- nama household, penerima undangan, nama institusi finansial mentah, dan support attachment.

Daftar key denylist minimum: `amount`, `balance`, `merchant`, `note`, `tag_name`, `account_name`, `account_number`, `card_number`, `receipt`, `ocr_text`, `image`, `audio`, `transcript`, `prompt`, `response`, `query`, `email`, `name`, `google_sub`, `address`, `latitude`, `longitude`, `token`, `authorization`, `cookie`.

Client memakai allowlist property per event. Ingest server menjalankan denylist recursive, schema validation, size limit 8 KB/event, dan drop-on-violation. Pelanggaran menaikkan counter tanpa menyimpan payload pelanggar.

## 4. Arsitektur First-party

1. Mobile SDK membentuk event dari schema allowlist dan menyimpannya pada queue lokal terenkripsi.
2. Event hanya dikirim bila kategori consent sesuai; essential operations memakai stream terpisah dan tidak memuat perilaku finansial.
3. Supabase Edge Function `analytics-ingest` memvalidasi schema/version, menghapus property tak dikenal, menolak payload sensitif, dan melakukan dedupe `event_id`.
4. Event valid disimpan dalam schema analytics terpisah dari ledger. Mobile client tidak mempunyai read access langsung ke tabel analytics.
5. Job agregasi menghasilkan tabel harian/cohort. Dashboard membaca agregat; raw event dibatasi untuk Data dan Security sesuai kebutuhan kerja.
6. User identifier analytics adalah HMAC internal yang dapat dihapus/dirotasi, bukan ID Google atau email. Installation ID adalah UUID acak tanpa advertising ID.

Tidak ada session replay, heatmap berisi layar finansial, keystroke capture, atau third-party ad SDK pada baseline.

## 5. Kontrak Event Global

### 5.1 Naming

- Format: `domain_object_action` dalam `lower_snake_case`.
- Event menyatakan fakta yang sudah terjadi, misalnya `transaction_created`, bukan `create_transaction`.
- Perubahan makna memerlukan event baru atau kenaikan `schema_version`; jangan mengubah denominator historis diam-diam.

### 5.2 Property wajib setiap event

| Property | Type | Aturan |
|---|---|---|
| `event_id` | UUID | Dibuat sekali di client; idempotency/dedupe |
| `event_name` | enum | Sesuai registry dokumen ini |
| `schema_version` | integer | Mulai `1`; reject versi tak didukung |
| `client_event_at` | ISO-8601 | Waktu perangkat + offset; server memberi flag clock skew |
| `received_at` | ISO-8601 | Ditambahkan server |
| `installation_id` | UUID | Acak, rotasi saat reinstall/reset privacy |
| `analytics_user_id` | string/null | HMAC internal hanya untuk event fitur product-consented setelah auth; null untuk pre-auth dan event `SYS_*` essential |
| `app_session_id` | UUID | Baru setelah 30 menit tidak aktif |
| `platform` | enum | `ios`, `android` |
| `app_version` | string | Versi store |
| `build_number` | string | Build native |
| `ota_update_id` | string | Hash/ID release, bukan source code |
| `runtime_version` | string | Runtime compatibility OTA |
| `release_channel` | enum | `development`, `preview`, `production` |
| `locale` | BCP-47 | Contoh `id-ID` |
| `timezone_offset_min` | integer | Offset saja, bukan lokasi |
| `network_state` | enum | `offline`, `wifi`, `cellular`, `unknown` |
| `space_type` | enum | `none` sebelum ruang tersedia, lalu `personal` atau `household` |
| `feature_id` | enum/null | `F01`–`F24` untuk event fitur; `null` untuk event sistem |
| `system_domain` | enum | `NONE` untuk event fitur, `SYS_LIFECYCLE` untuk lifecycle app, atau `SYS_RELEASE` untuk OTA/release |
| `consent_version` | string | Versi copy consent |

Setiap event mempunyai tepat satu owner: `feature_id` terisi dan `system_domain=NONE`, atau `feature_id=null` dan `system_domain` berisi owner sistem. `app_opened` serta `app_ready` dimiliki `SYS_LIFECYCLE`; seluruh `ota_*` dimiliki `SYS_RELEASE`. Event auth/onboarding dimiliki F01, consent/security F24, dan sync F18. Property opsional hanya boleh berasal dari tabel event berikut. Error memakai `error_class` enum; stack/message mentah tidak masuk product analytics.

### 5.3 Bucket baku

- `duration_bucket`: `<1s`, `1-3s`, `3-10s`, `10-30s`, `30-60s`, `1-5m`, `>5m`.
- `count_bucket`: `0`, `1`, `2-3`, `4-10`, `11-50`, `>50`.
- `result_count_bucket`: `0`, `1-5`, `6-20`, `21-100`, `>100`.
- `queue_size_bucket`: `0`, `1`, `2-10`, `11-50`, `>50`.
- `query_length_bucket`: `1-3`, `4-10`, `11-30`, `>30`; isi query tidak dikirim.

### 5.4 Coverage registry F01–F24

| Feature ID | Measurement question | Event utama |
|---|---|---|
| F01 | Apakah auth dan onboarding selesai tanpa friksi? | `auth_completed`, `onboarding_completed` |
| F02 | Apakah preferensi awal tersimpan dan membantu aktivasi? | `onboarding_step_completed`, `preference_changed` |
| F03 | Apakah rekening dibuat dan tetap terkelola? | `account_created`, `account_archived` |
| F04 | Apakah pengguna memanfaatkan kategorisasi dan rule? | `category_rule_created`, `capture_field_corrected` |
| F05 | Apakah transaksi manual tersimpan dengan andal? | `transaction_submit_attempted`, `transaction_created` |
| F06 | Apakah transfer/split selesai tanpa ketidakseimbangan? | `transfer_created`, `transaction_create_failed` |
| F07 | Apakah receipt menghasilkan draf yang usable dan disimpan? | `capture_processing_completed`, `receipt_image_disposition` |
| F08 | Apakah voice menghasilkan draf yang usable dan disimpan? | `voice_recording_stopped`, `capture_processing_completed` |
| F09 | Apakah ringkasan harian dibuka setelah data tersedia? | `dashboard_summary_viewed`, `dashboard_card_opened` |
| F10 | Apakah laporan cash flow/net worth dipakai untuk drill-down? | `report_viewed`, `report_drilldown_opened` |
| F11 | Apakah anggaran dibuat dan ditinjau kembali? | `budget_created`, `budget_status_viewed` |
| F12 | Apakah target dibuat dan mendapat kontribusi? | `goal_created`, `goal_contribution_recorded` |
| F13 | Apakah tagihan/langganan berulang dikelola? | `recurring_rule_created`, `bill_status_changed` |
| F14 | Apakah utang/pinjaman dicatat dan pembayaran ditautkan? | `debt_created`, `debt_payment_recorded` |
| F15 | Apakah kalender/proyeksi membantu peninjauan periode depan? | `calendar_forecast_viewed` |
| F16 | Apakah search, review, dan rekonsiliasi menyelesaikan masalah? | `search_performed`, `review_item_resolved`, `reconciliation_completed` |
| F17 | Apakah multi-currency digunakan tanpa menghambat transaksi? | `currency_context_used`, `transaction_created` |
| F18 | Apakah mutation offline tersinkron dalam SLO? | `network_restored`, `sync_mutation_acknowledged`, `sync_completed` |
| F19 | Apakah notifikasi/widget/shortcut menuju aksi bermakna? | `notification_opened`, `widget_action_used`, `shortcut_used` |
| F20 | Apakah impor, ekspor, dan backup selesai dengan benar? | `import_completed`, `export_completed`, `backup_completed` |
| F21 | Apakah insight/assistant menghasilkan aksi yang dikonfirmasi? | `insight_action_selected`, `assistant_action_resolved` |
| F22 | Apakah koneksi bank/e-wallet terhubung dan refresh andal? | `institution_connection_completed`, `institution_sync_completed` |
| F23 | Apakah household mencapai kolaborasi anggota kedua? | `household_invite_resolved`, `space_switched` |
| F24 | Apakah kontrol keamanan/privasi digunakan dan berfungsi? | `security_reauth_completed`, `security_privacy_mode_changed` |

## 6. Event Taxonomy

### 6.0 Aturan property kondisional

- Property yang tidak berlaku harus dihilangkan, bukan diisi nilai palsu, kecuali tabel menentukan enum `not_applicable`.
- `page_count_bucket` wajib hanya ketika `method=receipt` dan dilarang ketika `method=voice`.
- `attachment_retained` wajib berupa boolean pada `transaction_submit_attempted` dan `transaction_created`; gunakan `false` bila tidak ada lampiran.
- `split_count_bucket` wajib; gunakan bucket `0` untuk transaksi tanpa split.
- `minutes_since_reconnect_bucket` memakai `<1`, `1-3`, `3-5`, `>5`, atau `not_applicable` untuk mutation online yang tidak menunggu reconnect.
- `error_class` hanya hadir ketika `outcome/result` adalah `partial` atau `failed`; emitter tidak mengirim string kosong.

### 6.1 Lifecycle, auth, consent, dan onboarding — F01/F02/F24

| Event name | Trigger | Property khusus yang diizinkan |
|---|---|---|
| `app_opened` | App masuk foreground dan session baru | `launch_type: cold/warm/deep_link/notification` |
| `app_ready` | Shell interaktif siap | `launch_duration_bucket`, `used_cached_data: boolean`, `product_analytics_consent: boolean`, `crash_diagnostics_consent: boolean` |
| `consent_presented` | Control consent terlihat | `surface: onboarding/settings`, `categories_shown: enum[]` |
| `consent_updated` | Pengguna menyimpan pilihan | `product_analytics: boolean`, `crash_diagnostics: boolean`, `ai_personalization: boolean`, `source: onboarding/settings` |
| `auth_started` | Google OAuth dimulai | `provider: google`, `entry_point: welcome/session_expired/sensitive_action` |
| `auth_completed` | Backend menerima sesi valid | `provider: google`, `is_new_user: boolean`, `duration_bucket` |
| `auth_failed` | Auth berakhir gagal | `provider: google`, `error_class`, `retryable: boolean` |
| `onboarding_started` | Layar onboarding pertama tampil | `resumed: boolean` |
| `onboarding_step_viewed` | Step siap diinteraksi | `step_id`, `position: integer` |
| `onboarding_step_completed` | Step disimpan/dilewati | `step_id`, `position`, `skipped: boolean`, `duration_bucket` |
| `onboarding_completed` | Syarat onboarding selesai | `duration_bucket`, `goals_count_bucket`, `first_account_type` |
| `preference_changed` | Preferensi tersimpan | `preference_key`, `value_enum`, `surface` |
| `session_locked` | App lock aktif | `trigger: timeout/background/manual/risk` |
| `session_unlocked` | Unlock berhasil | `method: biometric/device_credential/google_reauth`, `result` |
| `account_deletion_requested` | Request diterima server | `grace_period_days: 7`, `reauth_method` |

`step_id`, `preference_key`, `value_enum`, dan `error_class` adalah enum versioned; nilai bebas ditolak.

### 6.2 Quick Add, manual, receipt, dan voice — F05/F06/F07/F08

| Event name | Trigger | Property khusus yang diizinkan |
|---|---|---|
| `quick_add_opened` | Sheet terlihat | `entry_point: tab/widget/shortcut/account/activity/deep_link` |
| `capture_started` | Metode dipilih | `method: manual/receipt/voice/transfer`, `entry_point`, `is_offline: boolean` |
| `capture_permission_result` | Prompt OS selesai | `permission: camera/photos/microphone`, `result: granted/denied/limited/blocked`, `method` |
| `voice_recording_started` | Mikrofon mulai menangkap | `processing_location: device`; cloud hanya boleh muncul pada event Phase 5 opt-in dengan schema terpisah |
| `voice_recording_stopped` | Rekaman dihentikan | `duration_bucket`, `stop_reason: user/limit/interruption/error/cancel` |
| `capture_processing_started` | OCR/parser voice dimulai | `method: receipt/voice`, `processing_location: device`, `page_count_bucket` hanya untuk receipt; cloud hanya boleh muncul pada event Phase 5 opt-in dengan schema terpisah |
| `capture_processing_completed` | Proses menghasilkan hasil/failure | `method`, `outcome: usable/partial/failed`, `duration_bucket`, `required_fields_complete: boolean`, `low_confidence_field_count_bucket`, `error_class` |
| `capture_review_viewed` | Draf hasil tampil | `method`, `required_fields_complete`, `duplicate_candidate: boolean` |
| `capture_field_corrected` | Pengguna mengubah hasil | `method`, `field_name: type/date/account/category/total/tax/discount/currency/item`, `correction_method: tap/voice` |
| `receipt_image_disposition` | Setelah review selesai | `retained: boolean`, `source: camera/library`, `page_count_bucket` |
| `voice_transcript_disposition` | Setelah parsing selesai | `retained: boolean`; baseline selalu `false` kecuali pengguna memilih lain |
| `transaction_submit_attempted` | Submit lolos validasi client | `method`, `transaction_type: expense/income/transfer/adjustment`, `is_offline`, `currency_code`, `split_count_bucket`, `attachment_retained` |
| `transaction_created` | Server ack atau durable local commit | `method`, `transaction_type`, `is_offline`, `currency_code`, `has_category`, `is_recurring`, `split_count_bucket`, `attachment_retained` |
| `transaction_create_failed` | Commit gagal | `method`, `error_class`, `retryable`, `local_draft_preserved` |
| `transaction_undone` | Undo sukses | `method`, `within_seconds_bucket: 0-5/6-30/>30` |
| `transfer_created` | Pasangan transfer tersimpan | `is_cross_currency`, `has_fee`, `is_offline` |

Tidak ada property nominal atau nilai field hasil parsing. `currency_code` diperbolehkan karena merupakan konfigurasi format, bukan nilai finansial.

### 6.3 Aktivitas, kategori, rekening, dan multi-currency — F03/F04/F16/F17

| Event name | Trigger | Property khusus yang diizinkan |
|---|---|---|
| `account_created` | Rekening/aset/liabilitas tersimpan, termasuk Tunai default yang dibuat onboarding | `account_type`, `currency_code`, `creation_method: onboarding/manual/sync/import` |
| `account_archived` | Rekening diarsipkan | `account_type`, `has_pending_sync: boolean` |
| `category_rule_created` | Aturan aktif | `condition_type`, `action_type`, `priority_bucket` |
| `activity_viewed` | Timeline siap | `period_bucket`, `review_count_bucket`, `privacy_mode` |
| `search_performed` | Search dikirim | `scope`, `filters_count_bucket`, `result_count_bucket`, `query_length_bucket` |
| `review_item_opened` | Item review dibuka | `review_type: duplicate/uncategorized/low_confidence/sync_conflict/reconciliation` |
| `review_item_resolved` | Review selesai | `review_type`, `resolution`, `duration_bucket` |
| `reconciliation_completed` | Rekonsiliasi periode selesai | `account_type`, `match_rate_bucket: <50/50-79/80-94/95-99/100`, `duration_bucket` |
| `currency_context_used` | Flow memakai non-base currency | `currency_code`, `context: account/transaction/report/transfer`, `rate_source: provider/manual` |

### 6.4 Dashboard, laporan, rencana, dan AI — F09–F15/F21

| Event name | Trigger | Property khusus yang diizinkan |
|---|---|---|
| `dashboard_summary_viewed` | Ringkasan siap dan terdapat data | `summary_period: today/week/month`, `privacy_mode`, `has_review_items` |
| `dashboard_card_opened` | Card dibuka | `card_type: accounts/cashflow/budget/tasks/insight/calendar` |
| `report_viewed` | Report siap | `report_type: cashflow/spending/income/net_worth/category/trend`, `period_bucket`, `comparison_enabled`, `privacy_mode` |
| `report_drilldown_opened` | Seri/segmen dibuka | `report_type`, `dimension: period/category/account/type` |
| `budget_created` | Anggaran tersimpan | `period_type`, `scope: category/group/total`, `rollover_enabled` |
| `budget_status_viewed` | Detail budget siap | `period_type`, `entry_point: dashboard/planning/notification` |
| `goal_created` | Target tersimpan | `deadline_bucket: <3m/3-6m/7-12m/>12m/none`, `schedule: manual/weekly/monthly` |
| `goal_contribution_recorded` | Kontribusi tertaut | `source: manual/transaction_rule`, `is_offline` |
| `recurring_rule_created` | Rule tersimpan | `rule_type: income/expense/transfer/bill/subscription`, `frequency` |
| `bill_status_changed` | Status berubah | `from_status`, `to_status`, `source: manual/linked_transaction/sync` |
| `debt_created` | Utang/piutang tersimpan | `creation_source: manual/import` |
| `debt_payment_recorded` | Cicilan tertaut | `source: manual/linked_transaction` |
| `calendar_forecast_viewed` | Forecast siap | `horizon_days: 7/14/30/90`, `scenario: baseline/custom` |
| `insight_impression` | Insight ≥50% terlihat ≥1 detik | `insight_type`, `explanation_available`, `action_available` |
| `insight_action_selected` | CTA insight dipilih | `insight_type`, `action_type` |
| `assistant_started` | Assistant dibuka | `entry_point: dashboard/report/transaction/budget` |
| `assistant_action_proposed` | Aksi terstruktur tampil | `action_type`, `requires_confirmation: boolean` |
| `assistant_action_resolved` | Usulan diterima/ditolak | `action_type`, `resolution: accepted/edited/dismissed` |
| `ai_feedback_submitted` | Feedback disimpan | `surface: insight/assistant/categorization`, `rating: helpful/not_helpful`, `reason_enum` |

Status budget, risiko forecast, posisi utang, dan ketepatan cicilan tidak dikirim ke analytics. Prompt, response, insight copy, dan angka pendukung juga tidak dikirim.

### 6.5 Offline, sync, notification, import/export — F18/F19/F20

| Event name | Trigger | Property khusus yang diizinkan |
|---|---|---|
| `offline_mode_entered` | App mendeteksi offline | `previous_network_state`, `queue_size_bucket` |
| `network_restored` | Koneksi usable kembali | `offline_duration_bucket`, `queue_size_bucket` |
| `sync_started` | Sync worker mulai | `trigger: reconnect/foreground/pull/manual/background`, `queue_size_bucket` |
| `sync_mutation_acknowledged` | Mutation lokal mendapat ack | `mutation_id_hash`, `object_type`, `minutes_since_reconnect_bucket: <1/1-3/3-5/>5/not_applicable`, `attempt_count_bucket` |
| `sync_completed` | Batch sync berakhir | `outcome: success/partial/failed`, `duration_bucket`, `mutation_count_bucket`, `conflict_count_bucket`, `error_class` |
| `sync_conflict_presented` | UI konflik tampil | `object_type`, `conflict_field_group` |
| `sync_conflict_resolved` | Pilihan tersimpan | `object_type`, `resolution: device/server/manual_merge`, `duration_bucket` |
| `notification_permission_result` | Prompt OS selesai | `result`, `primer_seen`, `source` |
| `notification_opened` | Deep link dibuka | `notification_type`, `destination`, `delivery_age_bucket` |
| `widget_action_used` | Aksi widget digunakan | `widget_type`, `action_type`, `privacy_mode` |
| `shortcut_used` | Shortcut membuka flow | `shortcut_type`, `result: opened/auth_required/failed` |
| `import_started` | File lolos pemeriksaan awal | `file_type`, `source`, `row_count_bucket` |
| `import_completed` | Job selesai | `file_type`, `outcome`, `row_count_bucket`, `accepted_count_bucket`, `rejected_count_bucket`, `duration_bucket` |
| `export_requested` | Cakupan dikonfirmasi | `format`, `scope`, `period_bucket`, `delivery: device/share` |
| `export_completed` | File siap | `format`, `outcome`, `row_count_bucket`, `duration_bucket` |
| `backup_completed` | Backup terverifikasi | `trigger: manual/scheduled`, `outcome`, `duration_bucket` |

`mutation_id_hash` unik hanya dalam project dan dihapus bersama raw operational log; tidak dapat dipakai untuk mengakses objek ledger.

### 6.6 Bank/e-wallet dan household — F22/F23

| Event name | Trigger | Property khusus yang diizinkan |
|---|---|---|
| `institution_connection_started` | Flow provider dibuka | `connector_id_hash`, `institution_type: bank/ewallet/card`, `entry_point` |
| `institution_connection_completed` | Callback tervalidasi | `connector_id_hash`, `institution_type`, `outcome`, `account_count_bucket`, `duration_bucket`, `error_class` |
| `institution_sync_completed` | Refresh selesai | `connector_id_hash`, `outcome`, `imported_count_bucket`, `duplicate_count_bucket`, `duration_bucket`, `reauth_required` |
| `institution_connection_disconnected` | Token dicabut dan koneksi dihapus | `connector_id_hash`, `reason: user/revoked/error/security` |
| `household_created` | Ruang aktif | `creation_source`, `initial_role: owner` |
| `household_invite_sent` | Undangan diterima server | `role`, `channel: link/system_share`, `expiry_bucket` |
| `household_invite_resolved` | Undangan selesai | `role`, `resolution: accepted/declined/expired/revoked` |
| `household_role_changed` | Perubahan role sukses | `from_role`, `to_role`, `actor_role` |
| `space_switched` | Ruang aktif berubah | `from_type`, `to_type`, `entry_point` |

Nama institusi dan identitas anggota tidak dikirim; `connector_id_hash` dipakai untuk reliability per connector dan tidak ditampilkan di product analytics umum bila volume cohort di bawah batas privasi.

### 6.7 Security events — F24, essential stream

| Event name | Trigger | Property khusus yang diizinkan |
|---|---|---|
| `security_reauth_completed` | Aksi sensitif direauth | `action_type`, `method`, `outcome`, `risk_class` |
| `security_session_revoked` | Session dicabut | `trigger: user/risk/admin_expiry`, `target: current/other/all` |
| `security_risk_detected` | Rule risiko memicu | `risk_class`, `action_taken`, `rule_version` |
| `security_rate_limit_triggered` | Batas endpoint tercapai | `endpoint_class`, `actor_type`, `limit_policy` |
| `security_export_accessed` | File ekspor diunduh/dibagikan | `export_job_id_hash`, `access_method`, `auth_age_bucket` |
| `security_privacy_mode_changed` | Privacy mode berubah | `from_mode`, `to_mode`, `source` |
| `security_audit_log_viewed` | Audit log dibuka | `period_bucket`, `filters_count_bucket` |

Security stream tidak tunduk pada product analytics consent karena diperlukan untuk integritas akun, tetapi tetap diminimalkan, dibatasi aksesnya, dan tidak dipakai untuk eksperimen atau marketing.

### 6.8 OTA update dan runtime health — SYS_RELEASE

| Event name | Trigger | Property khusus yang diizinkan |
|---|---|---|
| `ota_check_completed` | Pemeriksaan update selesai | `result: available/current/incompatible/failed`, `trigger`, `error_class` |
| `ota_download_completed` | Bundle tervalidasi | `target_update_id`, `duration_bucket`, `size_bucket`, `result`, `error_class` |
| `ota_update_applied` | App boot pada update baru | `target_update_id`, `previous_update_id`, `apply_trigger: restart/background/manual` |
| `ota_update_failed` | Check/download/launch gagal | `target_update_id`, `phase`, `error_class`, `rollback_available` |
| `ota_rollback_detected` | Runtime kembali ke update aman | `failed_update_id`, `rollback_target_id`, `reason_class` |

`target_update_id` adalah release identifier non-sensitif. Semua event pada bagian ini memakai `feature_id=null` dan `system_domain=SYS_RELEASE`. OTA hanya diberikan ke build dengan `runtime_version` kompatibel; perubahan native memerlukan build store baru. Event `app_ready` menjadi bukti update benar-benar dapat digunakan, bukan hanya terunduh.

## 7. Funnel Utama

| Funnel | Langkah berurutan | Window | Breakdown aman |
|---|---|---|---|
| New user activation | `auth_completed` → `onboarding_completed` → `account_created`/default account ready → `transaction_created` → `dashboard_summary_viewed` | 24 jam | platform, app version, onboarding entry point |
| Manual quick add | `quick_add_opened` → `capture_started.manual` → `transaction_submit_attempted` → `transaction_created` | 5 menit | entry point, offline, transaction type |
| Receipt capture | `capture_started.receipt` → permission granted/already granted → `capture_processing_completed` → `capture_review_viewed` → `transaction_created` | 15 menit | source, page bucket, processing location |
| Voice capture | `capture_started.voice` → `voice_recording_started` → `capture_processing_completed` → `capture_review_viewed` → `transaction_created` | 10 menit | processing location, duration bucket |
| Budget adoption | `dashboard_card_opened.budget`/Rencana → `budget_created` → `budget_status_viewed` | 14 hari | period type, scope |
| Bank connection | `institution_connection_started` → `institution_connection_completed.success` → `institution_sync_completed.success` → review selesai | 24 jam | connector hash only when privacy threshold met |
| Household adoption | `household_created` → `household_invite_sent` → `household_invite_resolved.accepted` → meaningful action oleh anggota kedua | 14 hari | platform, invite role |

Drop-off dihitung sebagai tidak adanya langkah berikutnya dalam window, bukan event `abandoned` yang mudah bias akibat app kill.

## 8. Cohort dan Segmentasi

### Cohort yang diperbolehkan

- Minggu aktivasi dan app version pertama.
- Platform, OS major, locale, dan device performance class kasar.
- Metode capture pertama: manual, receipt, voice.
- Ruang: personal atau household.
- Penggunaan offline: tidak pernah, sesekali, sering berdasarkan persentase session bucket.
- Feature adoption: budget, goal, report, bank sync, household.
- Release channel dan OTA update ID.

### Segmentasi yang dilarang

- Berdasarkan nominal, saldo, utang, keterlambatan, merchant, kategori sensitif, prediksi kesehatan finansial, atau isi assistant.
- Cohort dengan kurang dari 50 pengguna unik pada dashboard umum.
- Upaya mengidentifikasi pengguna dari kombinasi institusi, lokasi, device, dan waktu.
- Target marketing berdasarkan data finansial atau aktivitas rumah tangga.

## 9. Quality dan Reliability Metrics

| Metrik | Rumus | Target/alert |
|---|---|---|
| Transaction durable-save latency | p95 dari submit sampai server ack atau local durable commit | p95 ≤1 detik |
| Duplicate transaction rate | Transaksi yang di-undo/merge sebagai duplikat ≤24 jam / seluruh transaksi baru | <0,2% |
| OCR processing latency | p95 `capture_processing_completed - started`, receipt | p95 ≤8 detik |
| Voice processing latency | p95 `capture_processing_completed - recording_stopped` | p95 ≤4 detik |
| Sync batch success | `sync_completed.success` / seluruh `sync_completed` | Target ≥99%; alert bila <99% selama 15 menit |
| Sync recovery SLO | Mutation ack ≤5 menit setelah reconnect / mutation menunggu | Target ≥99,5%; page bila <99% rolling 1 jam dengan ≥100 mutation |
| Conflict rate | Batch dengan konflik / batch sync berisi mutation | <1% |
| Bank refresh success | `institution_sync_completed.success` / seluruh refresh yang mencapai callback | ≥97%; breakdown connector hanya n≥50 |
| Import acceptance quality | Accepted rows / parsed rows, dilaporkan per format | Monitor; alert regresi >5 pp terhadap baseline 28 hari |
| Crash-free sessions | 1 − crash sessions / valid sessions | Beta ≥99,7%; GA ≥99,9% |
| ANR-free sessions Android | 1 − ANR sessions / Android sessions | ≥99,8% |
| App ready latency | p95 foreground-to-interactive per device class | p95 ≤2,5 detik pada mid-tier |

`Sync batch success ≥99%` adalah health threshold awal, bukan pengganti SLO mutation 99,5% dalam lima menit.

## 10. Security dan Privacy Metrics

- **Sensitive payload violation:** 0 accepted event; setiap event yang ditolak karena denylist memicu alert Security tanpa menyimpan payload.
- **Unauthorized analytics read:** 0; audit harian terhadap RLS/service-role access.
- **Account takeover terkonfirmasi:** 0; diukur sebagai incident security, bukan product event.
- **Suspicious session containment:** p95 ≤15 menit dari high-risk detection sampai session revoke.
- **Deletion completion:** 100% raw analytics tertaut dihapus/anonymized ≤30 hari sejak permintaan efektif.
- **Consent enforcement:** 100% product event mempunyai consent aktif pada `client_event_at` dan `received_at`.
- **Crash-log redaction:** 100% sample audit mingguan bebas token, PII, nominal, receipt, transcript, prompt, dan response.
- **Minimum cohort suppression:** 100% query dashboard publik menyembunyikan cell <50 pengguna unik.

## 11. OTA Measurement dan Release Gates

### 11.1 Eligibility

Perangkat eligible jika `release_channel`, platform, dan `runtime_version` cocok dengan update; perangkat membuka app sekurangnya sekali dalam window pengamatan. Perangkat yang memerlukan native build baru tidak masuk denominator OTA.

### 11.2 Rollout

1. Internal 5% selama minimum 2 jam dan ≥200 session.
2. Beta 20% selama minimum 6 jam dan ≥1.000 session.
3. Production 50% selama minimum 12 jam.
4. Production 100% setelah semua guardrail lulus.

Promosi berhenti otomatis bila crash-free turun di bawah threshold channel, `app_ready` gagal >0,5%, transaction save failure naik >0,3 percentage point, sync success turun >1 percentage point, atau rollback rate mencapai 0,5%.

### 11.3 Runtime rule

OTA bundle hanya kompatibel dengan build yang mempunyai `runtime_version` sama. Perubahan native dependency, permission, entitlements, atau Expo SDK memerlukan build iOS/Android baru melalui store; analytics membedakan `app_version`, `build_number`, dan `ota_update_id`.

## 12. Retensi dan Penghapusan Data

| Dataset | Retensi | Penghapusan |
|---|---:|---|
| Raw product analytics | 90 hari | Data tertaut dipurge dari store aktif pada Day 7 bila request tidak dibatalkan |
| Raw crash diagnostics tersanitasi | 30 hari | Data tertaut dipurge dari store aktif pada Day 7; attachment sensitif tidak diizinkan |
| Essential sync operational logs | 30 hari | Mutation hash dan error class saja; data tertaut dipurge pada Day 7 |
| Security audit events | 365 hari | Akses terbatas Security; setelah itu dihapus kecuali legal hold yang terdokumentasi |
| Experiment assignment/raw exposure | 90 hari setelah eksperimen selesai | Data tertaut dipurge pada Day 7; sisanya dihapus otomatis setelah agregasi final |
| Daily aggregate tanpa identifier | 25 bulan | Tidak dapat direidentifikasi; cell <50 disuppress |
| OTA release health aggregate | 25 bulan | Per update/build/channel, tanpa user ID |
| Backup yang sempat memuat data akun terhapus | Maksimum Day 30 sejak original deletion request | Aging out otomatis; restore wajib menjalankan deletion tombstone sebelum sistem aktif |

IP tidak disimpan sebagai property analytics. Infrastruktur boleh memproses IP secara transient untuk rate limiting, lalu menghapus atau menganonimkannya sesuai konfigurasi keamanan.

### 12.1 Lifecycle penghapusan akun

- Day 0: recent authentication dan request tercatat; semua pengiriman product analytics baru dihentikan, session lain dicabut, dan grace period 7 hari dimulai.
- Day 0–7: pembatalan hanya melalui autentikasi ulang; bila dibatalkan, consent sebelumnya tidak otomatis diaktifkan kembali dan pengguna memilihnya lagi.
- Day 7: purge aktif menghapus identifier mapping, raw product analytics, diagnostics, sync log tertaut, experiment assignment, serta objek domain sesuai deletion manifest.
- Setelah purge: aggregate yang benar-benar anonim tetap dapat dipertahankan; security audit minimum dipseudonimkan agar tidak dapat dipakai untuk profiling.
- Maksimum Day 30 sejak original deletion request: seluruh backup yang pernah memuat data akun aging out. Restore sebelum batas itu wajib membaca deletion tombstone dan tidak boleh menghidupkan akun/data yang sudah dipurge.

## 13. Dashboard

### 13.1 Executive Product Health

- Onboarding completion, activation 24 jam, WAU/MAU, D30.
- Weekly meaningful actions per active user.
- Adopsi F05/F07/F08/F11/F12/F21/F22/F23.
- Crash-free, sync recovery SLO, dan open incidents.

### 13.2 Onboarding & First Value

- Funnel per step, median/p95 time-to-activation.
- Drop-off per platform/app version.
- First capture method dan draft-to-save rate.

### 13.3 Capture Quality

- Manual submit success.
- Receipt/voice usable extraction, correction rate per field name, draft-to-save.
- Permission denial/blocked rate dan fallback ke manual.
- Processing latency, duplicate candidate, undo rate.

### 13.4 Engagement & Planning

- Meaningful action mix, report revisit, budget/goal retention.
- Cohort personal vs household dan first-capture method.
- Insight impression → action → resolution; prompt/response tidak tersedia.

### 13.5 Sync, Bank & Offline

- Queue size, recovery SLO, batch success, conflict rate, offline duration.
- Connector success/reauth/latency dengan suppression n<50.
- Import acceptance per format dan version.

### 13.6 Release & OTA

- Eligible devices, download, apply, `app_ready`, adoption 1/6/24/72 jam.
- Crash-free dan save/sync guardrail per update.
- Rollback rate, error class, runtime incompatibility.

### 13.7 Security & Privacy

- Consent state aggregate, consent changes tanpa optimasi acceptance.
- Sensitive-payload rejection counter, deletion SLA, session revoke latency.
- Audit access dan cohort suppression violations.

## 14. Alerting

| Severity | Kondisi | Respons |
|---|---|---|
| SEV-0 | Sensitive data diterima analytics; auth bypass; ledger corruption; confirmed account takeover | Hentikan ingest/release terkait, incident response segera |
| SEV-1 | Crash-free GA <99,9%; sync recovery <99% 1 jam; save failure >1%; OTA rollback ≥0,5% | Freeze rollout, on-call ≤15 menit |
| SEV-2 | OCR/voice success turun >5 pp; bank connector success <95%; latency p95 >2× target | Triage hari yang sama |
| SEV-3 | Funnel turun >3 pp dengan volume cukup dan tanpa reliability impact | Review mingguan |

Alert memakai minimum sample agar noise rendah, tetapi SEV-0 privacy/security tidak memiliki minimum sample.

## 15. Experimentation Guardrails

### 15.1 Aturan

- Assignment dilakukan server-side, stabil per `analytics_user_id`, dan dicatat `experiment_id`, `variant_id`, `assigned_at`.
- Maksimum satu primary metric, tiga secondary metrics, dan guardrail yang ditetapkan sebelum exposure pertama.
- Eksperimen berjalan minimum 14 hari dan dua siklus mingguan; tidak dihentikan hanya karena hasil awal terlihat positif.
- Analisis memakai intention-to-treat; perubahan sample ratio >1% dari alokasi memblokir keputusan.
- Pengguna yang tidak memberi product analytics consent tidak masuk eksperimen berbasis pengukuran.
- Hasil dipotong per platform/app version untuk mendeteksi regresi, bukan untuk microtargeting.

### 15.2 Area yang tidak boleh dieksperimenkan

- Kekuatan autentikasi, enkripsi, RLS, rate limit, consent default, tombol menolak consent, penghapusan akun, privacy mode, dan disclosure biaya/risiko.
- Auto-posting OCR/voice/AI tanpa review.
- Copy yang mendorong rasa takut, malu, urgensi palsu, atau menyembunyikan konsekuensi finansial.
- Penargetan berdasarkan saldo, utang, merchant, kategori sensitif, atau isi assistant.

### 15.3 Guardrail wajib

- Crash-free tetap ≥99,7% beta atau ≥99,9% GA.
- Transaction submit success tidak turun >0,3 percentage point.
- Sync recovery SLO tidak turun >0,5 percentage point.
- Auth completion tidak turun >1 percentage point.
- Accessibility task completion pada test panel tidak turun >2 percentage point.
- Tidak ada kenaikan sensitive-payload rejection atau security incident.
- Variant dapat dimatikan server-side dan UI kembali ke baseline tanpa kehilangan data.

## 16. Data Quality dan Governance

- Schema registry menyimpan owner, feature ID, consent category, property allowlist, dan tanggal efektif setiap event.
- CI memvalidasi nama event/property terhadap registry dan menjalankan fixture berisi key terlarang untuk memastikan drop.
- `event_id` dedupe window 7 hari; event terlambat diterima sampai 72 jam dan diberi flag `late_arrival`.
- Clock skew >10 menit memakai `received_at` untuk funnel ordering dan diberi `clock_skew_bucket`.
- Monitoring harian memeriksa volume anomaly, null rate, enum baru, duplicate rate, consent mismatch, dan schema rejection.
- Perubahan funnel denominator memerlukan versioned metric dan anotasi dashboard; historical chart tidak ditulis ulang.
- Akses raw analytics menggunakan least privilege, MFA, audit log, dan review akses per kuartal.
- Tim Support hanya menerima aggregate atau support ID tersanitasi, tidak akses raw analytics secara default.

## 17. Acceptance Criteria Analytics

- Seluruh event menggunakan exact name/property allowlist dokumen ini dan membawa salah satu owner yang valid: `feature_id` F01–F24 dengan `system_domain=NONE`, atau `feature_id=null` dengan `system_domain=SYS_LIFECYCLE/SYS_RELEASE`.
- Tidak ada nominal, receipt, voice, transcript, prompt, response, search query, atau PII di event dan crash log.
- Consent diuji untuk fresh install, perubahan setting, logout/login, reinstall, dan account deletion.
- Funnel dapat direproduksi dari event fixture dengan denominator/window yang sama seperti tabel target.
- Offline queue tahan app restart, dedupe dengan `event_id`, dan tidak mengirim event setelah consent dicabut.
- Sync SLO, crash-free beta/GA, dan OTA adoption/rollback mempunyai alert dan release gate terpisah.
- Dashboard menerapkan suppression cohort <50 dan retention otomatis.
- Security review menyetujui ingest, storage, RLS, redaction, dan deletion job sebelum production.

## 18. Rujukan

- OWASP MASVS Privacy minimization: https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-1/
- OWASP MASVS secure storage: https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-1/
- OWASP MASVS prevention of data leakage: https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-2/
- OWASP sensitive data in logs: https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0005/
- Expo runtime versions and native compatibility: https://docs.expo.dev/eas-update/runtime-versions/
