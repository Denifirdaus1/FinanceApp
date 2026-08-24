# F02 — Profil Keuangan & Preferensi

## Status, fase, dan prioritas

- Status: Siap diimplementasikan
- Fase: Phase 1
- Prioritas: Wajib setelah F01, sebelum membuat transaksi pertama
- Platform/data: Expo SDK 56 + Supabase + cache/outbox SQLCipher

## Outcome dan Jobs To Be Done

Pengguna memperoleh tampilan angka, periode, dan pengalaman pencatatan yang sesuai konteksnya tanpa merusak makna transaksi historis.

**JTBD:** Ketika mulai memakai aplikasi, saya ingin menetapkan mata uang, zona waktu, dan preferensi keuangan agar seluruh angka dan ringkasan mudah dipahami serta tanggal transaksi konsisten.

## Scope

- Nama panggilan dan avatar tampilan.
- Locale, zona waktu, mata uang dasar, format angka/tanggal, awal minggu, dan awal bulan finansial.
- Preferensi notifikasi, privasi nominal, tema warm pastel, dan local unlock.
- Mode input default serta pilihan akun/kategori terakhir sebagai convenience setting.
- Wizard setup awal dan halaman edit preferensi.
- Perubahan preferensi offline dengan sinkronisasi aman.

## Non-scope

- Pembuatan rekening/aset/utang (F03), anggaran, target, profil pajak, household, dan kurs valuta asing.
- Pengubahan mata uang asli transaksi lama.
- Pengelolaan consent marketing atau newsletter.
- Kustomisasi warna bebas yang dapat menurunkan kontras.

## Alur UX

1. Setelah F01, wizard meminta negara/locale dengan default perangkat dan zona waktu IANA yang terdeteksi.
2. Pengguna memilih mata uang dasar; untuk locale Indonesia default `IDR` dan digit desimal 0.
3. Pengguna memilih tanggal awal bulan finansial (default 1), awal minggu (Senin), serta format angka/tanggal.
4. Pengguna memilih apakah nominal disamarkan saat aplikasi masuk background/app switcher dan apakah local unlock diaktifkan.
5. Ringkasan preferensi ditampilkan; satu tombol `Simpan dan lanjutkan` melakukan validasi dan menyimpan.
6. Setelah tersimpan, F03 menawarkan pembuatan akun pertama.
7. Perubahan berikutnya dilakukan di Pengaturan; dampak perubahan mata uang dasar dijelaskan sebelum konfirmasi.

## Functional requirements

- **F02-FR-001:** Wizard harus memiliki default yang berguna dari locale/timezone perangkat tetapi selalu dapat diedit.
- **F02-FR-002:** Mata uang menggunakan kode ISO 4217 dan metadata minor unit dari tabel versi aplikasi.
- **F02-FR-003:** Semua timestamp disimpan UTC; zona waktu IANA dipakai saat menentukan hari/periode lokal.
- **F02-FR-004:** Awal bulan finansial dapat dipilih 1–28 agar valid untuk semua bulan.
- **F02-FR-005:** Format angka harus menyediakan locale-aware formatting, simbol mata uang, dan pilihan posisi simbol yang mengikuti locale.
- **F02-FR-006:** Menyembunyikan nominal mengganti angka dengan placeholder konsisten pada beranda, widget, notifikasi, dan app switcher.
- **F02-FR-007:** Tema menyediakan `system`, `light`, dan `dark`; palet warm pastel ditentukan sebagai design token, bukan nilai warna bebas pengguna.
- **F02-FR-008:** Local unlock hanya dapat diaktifkan setelah autentikasi biometrik/passcode OS berhasil sekali.
- **F02-FR-009:** Penyimpanan awal harus memperbarui `profiles.onboarding_state = 'profile_complete'` secara atomik.
- **F02-FR-010:** Perubahan mata uang dasar tidak mengubah `currency_code` atau `amount_minor` transaksi lama; laporan mengonversi pada layer reporting bila kurs tersedia.
- **F02-FR-011:** Preferensi dapat dibaca dan diedit offline, lalu masuk outbox dengan `client_mutation_id`.
- **F02-FR-012:** Setiap field yang disimpan harus memiliki versi schema dan `updated_at` server untuk migrasi/sinkronisasi.
- **F02-FR-013:** Preview format menunjukkan contoh pemasukan, pengeluaran, dan tanggal sebelum pengguna menyimpan.
- **F02-FR-014:** Pengaturan notifikasi harus memisahkan pengingat pencatatan, ringkasan mingguan, dan peringatan anggaran; izin OS baru diminta saat toggle pertama diaktifkan.

## Aturan validasi dan bisnis

- `locale` harus BCP 47 yang didukung aplikasi; fallback `id-ID`.
- `timezone` harus nama IANA valid; fallback hanya untuk render jika zona tersimpan tidak dikenali, tanpa menimpa nilai server diam-diam.
- `base_currency` tepat tiga huruf uppercase dan ada di katalog ISO aplikasi.
- `financial_month_start` integer 1–28; `week_starts_on` integer 1 (Senin) atau 7 (Minggu).
- `display_name` setelah trim 1–80 karakter; kontrol Unicode dan karakter bidi berbahaya disanitasi saat ditampilkan/log.
- Perubahan base currency membutuhkan dialog yang menjelaskan bahwa histori tidak dikonversi permanen dan meminta konfirmasi eksplisit.
- Preferensi perangkat (`biometric_lock`, `hide_in_app_switcher`) tidak disinkronkan lintas perangkat; preferensi pengalaman dan finansial disinkronkan.
- `last_used_account_id` atau `last_used_category_id` harus milik user dan tidak diarsipkan; jika invalid, nilainya dikosongkan.

## Entitas dan field data

### `profiles` (ekstensi F01)

- `id uuid primary key`, `display_name text`, `avatar_url text null`
- `onboarding_state text`, `created_at`, `updated_at`, `version bigint`

### `user_preferences`

- `user_id uuid primary key references auth.users(id)`
- `locale text not null default 'id-ID'`
- `timezone text not null default 'Asia/Jakarta'`
- `base_currency char(3) not null default 'IDR'`
- `financial_month_start smallint not null default 1`
- `week_starts_on smallint not null default 1`
- `date_format text not null default 'DD/MM/YYYY'`
- `theme text not null default 'system'`
- `mask_amounts boolean not null default false`
- `reminder_enabled boolean`, `weekly_summary_enabled boolean`, `budget_alert_enabled boolean`
- `default_entry_mode text not null default 'expense'`
- `updated_at timestamptz not null`, `version bigint not null default 1`

### `device_preferences` (lokal SQLCipher, tidak disinkronkan)

- `device_id_hash`, `biometric_lock_enabled`, `hide_in_app_switcher`
- `last_used_account_id`, `last_used_category_id`, `updated_at`

### `currency_catalog` (bundled/read-only)

- `code`, `display_name`, `symbol`, `minor_unit`, `catalog_version`

## Services, interface, dan RPC

```ts
interface FinancialPreferences {
  locale: string;
  timezone: string;
  baseCurrency: string;
  financialMonthStart: number;
  weekStartsOn: 1 | 7;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  theme: 'system' | 'light' | 'dark';
  maskAmounts: boolean;
}

interface PreferencesRepository {
  get(): Promise<FinancialPreferences>;
  save(input: FinancialPreferences, expectedVersion: number, mutationId: string): Promise<number>;
  observe(): AsyncIterable<FinancialPreferences>;
}
```

- RPC `complete_financial_profile_v1(p_preferences jsonb, p_expected_version bigint, p_mutation_id uuid)` memvalidasi, upsert preference, dan memajukan onboarding secara atomik.
- RPC `update_financial_preferences_v1(...)` idempoten melalui tabel kanonis `mutation_deduplication` dan mengembalikan versi server.
- `FormattingService` menggunakan `Intl.NumberFormat`/`Intl.DateTimeFormat`, tidak menyusun format mata uang manual.
- `PeriodService` menghitung batas periode dari timezone IANA dan `financial_month_start`, lalu mengembalikan rentang UTC.

## Offline, sinkronisasi, dan konflik

- Snapshot `user_preferences` disimpan terenkripsi untuk render cepat.
- Save lokal menulis nilai dan outbox dalam satu transaksi SQLCipher; UI langsung merefleksikan perubahan dan menampilkan status `Menunggu sinkronisasi`.
- Server memeriksa `expected_version`. Jika konflik, merge per field berdasarkan `field_updated_at` yang ikut dalam payload; jika field sama berubah di dua perangkat, perubahan terbaru berdasarkan `server_received_at` menang dan pengguna mendapat banner ringkas.
- Mata uang dasar adalah field sensitif secara semantik: konflik pada field ini tidak auto-merge, tetapi meminta pengguna memilih salah satu nilai saat online.
- Device preferences tidak masuk outbox.
- Saat preference server dihapus karena account deletion, client wajib mengunci cache dan mengikuti alur F01.

## Permissions, privasi, dan keamanan

- Tidak ada permission OS pada wizard kecuali pengguna secara eksplisit mengaktifkan biometrik atau notifikasi.
- RLS `user_preferences`: `auth.uid() = user_id` untuk select/insert/update; delete hanya melalui alur penghapusan akun.
- RPC menggunakan `auth.uid()` dari JWT dan mengabaikan user ID dari payload.
- Avatar eksternal diproxy/cache secara aman atau dibatasi pada HTTPS; URL tidak dirender sebagai HTML.
- Nominal contoh pada preview bersifat dummy, bukan mengambil transaksi nyata.
- App-switcher privacy memakai native secure overlay; screenshot blocking Android dan blur overlay iOS dapat diaktifkan per perangkat.
- Nilai preference boleh dianalitik hanya sebagai kategori umum yang tidak sensitif; zona waktu, nama, dan mata uang spesifik tidak dikirim sebagai user property.

## State dan error

- `loading`, `editing`, `validating`, `saving_local`, `sync_pending`, `synced`, `conflict`, `error`.
- Locale/timezone tidak dikenal: tampilkan fallback dan opsi memilih ulang.
- Outbox gagal karena session expired: pertahankan perubahan terenkripsi, tandai perlu login ulang.
- Versi konflik: tampilkan nilai perangkat dan server untuk field yang bertabrakan tanpa membuang field lain.
- Izin notifikasi/biometrik ditolak: toggle kembali off dengan penjelasan dan shortcut ke Settings bila relevan.
- Penyimpanan awal gagal server: pengguna tetap bisa memperbaiki input; route finansial belum dibuka sampai transaksi server sukses.

## Analytics tanpa payload sensitif

- `financial_profile_started { entry_point }`
- `financial_profile_step_completed { step_key }`
- `financial_profile_completed { duration_bucket_s }`
- `preference_changed { preference_key, source }`
- `preference_sync_result { result, conflict_field_count }`
- `permission_prompt_result { permission_type, result }`

Tidak mengirim display name, timezone, base currency, nilai nominal, locale mentah, ID akun/kategori, atau isi konflik.

## Acceptance criteria (Given–When–Then)

1. **Given** perangkat ber-locale Indonesia, **When** wizard pertama terbuka, **Then** saran awal adalah `id-ID`, `IDR`, dan zona waktu IANA perangkat.
2. **Given** pengguna memilih awal bulan 29, **When** menyimpan, **Then** validasi menolak dan menjelaskan rentang 1–28.
3. **Given** pengguna mengubah base currency, **When** mengonfirmasi, **Then** preferensi berubah tetapi currency dan amount transaksi historis tetap identik.
4. **Given** perangkat offline, **When** pengguna mengubah tema dan awal minggu, **Then** UI langsung berubah dan satu mutasi idempoten tersimpan di outbox.
5. **Given** dua perangkat mengubah field berbeda, **When** keduanya sinkron, **Then** kedua perubahan dipertahankan melalui merge per field.
6. **Given** user A memakai anon/client key, **When** mencoba membaca preference user B, **Then** RLS mengembalikan kosong/ditolak.
7. **Given** mask amounts aktif, **When** aplikasi berpindah ke background, **Then** nominal tidak tampak di app switcher.

## Test matrix

| Area | Kasus minimum | Jenis |
|---|---|---|
| Validasi | ISO currency, locale, timezone, hari 0/1/28/29 | Unit/property test |
| Formatting | IDR, USD, JPY; angka negatif; RTL locale | Snapshot + unit |
| Periode | DST, akhir bulan, leap year, timezone berganti | Unit |
| Wizard | fresh user, kembali ke langkah sebelumnya, double submit | E2E |
| Offline | edit offline, restart, retry, session expired | Integrasi SQLCipher/outbox |
| Konflik | beda field, field sama, base currency | Integrasi |
| Security | RLS lintas user, RPC user spoofing | SQL test |
| Privacy UI | background snapshot, screenshot behavior, screen reader | Perangkat nyata |

## Implementasi bertahap dan dependensi

1. **Slice 1 — Schema dan domain:** migrasi preference/RLS, currency catalog, type dan validator, `FormattingService` dan `PeriodService`.
2. **Slice 2 — Wizard:** langkah locale/currency/periode, preview, atomic completion RPC, route guard F01→F02→F03.
3. **Slice 3 — Pengaturan:** edit screen, theme token warm pastel, mask nominal, device preferences.
4. **Slice 4 — Offline:** repository SQLCipher, atomic local write + outbox, replay idempoten, optimistic version/field merge.
5. **Slice 5 — Hardening:** aksesibilitas, DST/property tests, RLS tests, analytics contract, native privacy overlay.

Dependensi: F01 menyediakan session dan `profiles`; F03 memakai base currency dan format; seluruh ringkasan memakai `PeriodService`.

## Rollout dan kill switch

- Remote config: `financial_profile_v1_enabled`, `offline_preferences_enabled`, `local_privacy_controls_enabled`.
- Wizard v1 dirilis 10% pengguna baru, lalu 50%, 100% setelah completion rate dan error rate stabil.
- Schema preference bersifat additive dan client menyimpan `schema_version`; client lama mengabaikan field baru.
- Kill switch offline preference mengubah screen menjadi online-only tanpa menghapus outbox; replay dilanjutkan setelah switch hidup.
- Jika format/periode baru bermasalah, `PeriodService` dapat dipaksa ke aturan kalender standar sementara, dengan banner transparan dan tanpa menulis ulang transaksi.
