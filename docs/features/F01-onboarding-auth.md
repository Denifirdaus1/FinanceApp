# F01 — Onboarding & Autentikasi

## Status, fase, dan prioritas

- Status: Siap diimplementasikan
- Fase: Phase 0–1
- Prioritas: Wajib sebelum fitur finansial lain
- Platform: Android dan iOS melalui Expo SDK 56, React Native, TypeScript, dan Expo Router
- Backend: Supabase Auth, Postgres, Row Level Security (RLS)

## Outcome dan Jobs To Be Done

Pengguna dapat masuk dengan identitas tepercaya, memahami perlindungan datanya, dan mencapai beranda dalam kurang dari satu menit tanpa membuat kata sandi baru.

**JTBD:** Ketika pertama kali membuka aplikasi atau kembali setelah sesi berakhir, saya ingin masuk menggunakan akun yang sudah saya miliki agar data keuangan saya tersinkron dengan aman di perangkat saya sendiri.

## Scope

- Layar pembuka singkat dan tiga halaman pengenalan yang dapat dilewati.
- Google sebagai metode masuk utama di Android dan iOS.
- Sign in with Apple di iOS.
- Pembuatan profil pengguna secara otomatis pada login pertama.
- Persetujuan versi Syarat Layanan dan Kebijakan Privasi.
- Pemulihan sesi, refresh token, keluar dari perangkat, dan keluar dari semua perangkat.
- Penguncian lokal opsional dengan biometrik/PIN perangkat setelah sesi pertama berhasil.
- Deep link OAuth dan penanganan pembatalan atau kegagalan login.
- Jalur menuju penghapusan akun; eksekusi penghapusan dijelaskan pada fitur keamanan/pengaturan akun.

## Non-scope

- Login email/password, OTP SMS, akun anonim, dan akun keluarga bersama.
- KYC, verifikasi identitas pemerintah, atau pengaitan rekening bank.
- Pemulihan akun di luar mekanisme Google, Apple, dan Supabase.
- Impor data keuangan pada onboarding.

## Alur UX

1. Aplikasi melakukan bootstrap: membuka basis data SQLCipher, membaca status onboarding, lalu memeriksa sesi Supabase.
2. Pengguna baru melihat manfaat utama: catat cepat, pahami arus kas, dan data privat. Tombol `Lewati` langsung menuju layar masuk.
3. Layar masuk menampilkan `Lanjutkan dengan Google`; pada iOS juga menampilkan `Lanjutkan dengan Apple` dengan bobot visual setara.
4. Sebelum memulai OAuth, pengguna menyetujui Syarat Layanan dan Kebijakan Privasi melalui checkbox dan tautan versi aktif.
5. Browser/sheet autentikasi sistem dibuka. Callback kembali melalui universal/app link yang tervalidasi.
6. Aplikasi menukar callback/token, membuat atau mengambil profil, menyimpan sesi di secure storage, lalu membuat salinan profil minimum di SQLCipher.
7. Jika profil keuangan belum lengkap, pengguna diarahkan ke F02; jika lengkap, ke beranda.
8. Pada pembukaan berikutnya, sesi dipulihkan. Bila penguncian lokal aktif, biometrik/PIN perangkat diminta sebelum data lokal dibuka.

## Functional requirements

- **F01-FR-001:** Aplikasi harus menyediakan Google OAuth sebagai CTA utama di kedua platform.
- **F01-FR-002:** Aplikasi iOS harus menyediakan Sign in with Apple menggunakan token identitas Apple; tombol tidak ditampilkan di Android.
- **F01-FR-003:** Redirect URI harus dibentuk dari scheme aplikasi dan universal link produksi yang tercantum di allowlist Supabase.
- **F01-FR-004:** OAuth harus menggunakan PKCE/state atau validasi nonce bawaan SDK; callback dengan state/nonce tidak cocok ditolak.
- **F01-FR-005:** Login pertama harus membuat `profiles` dan `user_preferences` secara atomik melalui trigger/RPC idempoten.
- **F01-FR-006:** Pengguna tidak boleh masuk sebelum menyetujui versi dokumen legal aktif.
- **F01-FR-007:** Sesi persisten disimpan hanya di secure storage platform; token tidak boleh masuk AsyncStorage, log, analytics, atau SQLCipher.
- **F01-FR-008:** Refresh sesi dilakukan oleh Supabase client ketika aplikasi aktif dan dihentikan ketika aplikasi berada di background.
- **F01-FR-009:** `Keluar` menghapus sesi dan kunci pembuka lokal dari perangkat tanpa menghapus data server.
- **F01-FR-010:** `Keluar dari semua perangkat` memanggil sign-out global dan menghapus sesi lokal setelah server mengonfirmasi.
- **F01-FR-011:** Saat offline, pengguna yang pernah login boleh membuka snapshot lokal dengan biometrik/PIN; login pertama dan refresh yang diwajibkan tetap membutuhkan jaringan.
- **F01-FR-012:** Aplikasi harus membedakan kegagalan jaringan, pembatalan pengguna, akun dinonaktifkan, dan konfigurasi callback yang tidak valid.
- **F01-FR-013:** Semua layar autentikasi harus dapat digunakan dengan screen reader, dynamic type, fokus keyboard, dan target sentuh minimal 44×44 pt.
- **F01-FR-014:** Setiap login sukses harus mencatat waktu, provider, dan ID perangkat teracak untuk daftar sesi, tanpa menyimpan token atau profil provider berlebih.

## Aturan validasi dan bisnis

- Satu `auth.users.id` tepat satu `profiles.id` dan satu `user_preferences.user_id`.
- `user_consents` wajib berisi acknowledgement versi aktif untuk `terms` dan `privacy` sebelum akses ke fitur selain onboarding/pengaturan legal.
- Email dari provider hanya untuk identitas dan komunikasi keamanan; aplikasi tidak boleh menganggap email selalu tersedia pada login Apple.
- Nama tampilan maksimal 80 karakter setelah trim dan normalisasi Unicode; nama kosong memakai label netral `Pengguna`.
- Callback OAuth hanya menerima scheme, host, path, dan origin yang dikonfigurasi; parameter tujuan internal memakai allowlist route untuk mencegah open redirect.
- Setelah 30 hari tidak pernah tersambung, akses offline berubah menjadi baca-saja sampai sesi diverifikasi kembali.
- Lima kegagalan biometrik mengikuti kebijakan lockout OS; aplikasi tidak membuat sistem lockout kriptografi sendiri.

## Entitas dan field data

### `profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text not null`
- `avatar_url text null` — URL provider boleh kedaluwarsa dan bukan sumber otorisasi
- `onboarding_state text not null` — `auth_complete`, `profile_complete`, atau `complete`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `version bigint not null default 1`

### `user_consents`

- `id uuid primary key`
- `user_id uuid not null`
- `document_type text not null` — `terms` atau `privacy`
- `document_version text not null`
- `action text not null default 'acknowledged'`
- `recorded_at timestamptz not null`
- `locale text not null`
- Append-only; index `(user_id, document_type, recorded_at desc)` dan RPC memverifikasi acknowledgement versi aktif

### `device_installations`

- `id uuid primary key`, `user_id uuid`, `device_hash text`, `platform text`, `push_token text null`
- `provider text`, `app_version text`, `runtime_version text`, `last_seen_at timestamptz`, `created_at timestamptz`, `revoked_at timestamptz null`
- Tidak menyimpan access token, refresh token, IP mentah, atau device advertising ID.

Data lokal hanya menyimpan `profile_cache`, versi legal yang diterima, status onboarding, dan timestamp verifikasi sesi di SQLCipher.

## Services, interface, dan RPC

```ts
type AuthProvider = 'google' | 'apple';

interface AuthService {
  signIn(provider: AuthProvider): Promise<{ userId: string; isNewUser: boolean }>;
  restoreSession(): Promise<'valid' | 'offline-cached' | 'expired'>;
  signOut(scope: 'local' | 'global'): Promise<void>;
  acceptLegal(input: { termsVersion: string; privacyVersion: string; locale: string }): Promise<void>;
}
```

- Google: Supabase `signInWithOAuth`, PKCE, `expo-web-browser`, dan redirect dari `expo-linking`.
- Apple iOS: `expo-apple-authentication`, nonce tervalidasi, lalu Supabase `signInWithIdToken`.
- RPC `bootstrap_user_v1(p_display_name, p_terms_version, p_privacy_version, p_locale)` membuat/mengambil profil dan acceptance secara idempoten.
- RPC `register_device_session_v1(p_device_hash, p_platform, p_provider)` melakukan upsert `last_seen_at`.
- Edge/server function ber-service-role hanya dipakai untuk penghapusan akun atau revokasi administratif; client tidak pernah menerima service-role key.

## Offline, sinkronisasi, dan konflik

- Login pertama selalu online. Setelah itu `profile_cache` bisa dibaca offline setelah local unlock.
- Perubahan acceptance legal tidak diantrikan offline karena merupakan gerbang akses; pengguna harus online untuk menyetujui versi baru.
- Update profil dari F02 menggunakan outbox terenkripsi, bukan jalur auth.
- Bila akun dinonaktifkan saat perangkat offline, cache maksimal 30 hari dan hanya baca-saja setelah batas itu mengurangi risiko akses berkepanjangan.
- Konflik profil memakai `version` optimistic concurrency; layar F02 menangani merge per field.

## Permissions, privasi, dan keamanan

- Tidak meminta kamera, mikrofon, kontak, atau notifikasi pada onboarding; permission diminta tepat saat fitur digunakan.
- Token berada di iOS Keychain/Android Keystore melalui secure storage dengan opsi akses setelah perangkat terbuka.
- SQLCipher key dihasilkan acak per instalasi dan dibungkus Keystore/Keychain; keluar menghapus key lokal bila pengguna memilih `Hapus data dari perangkat ini`.
- RLS `profiles`, `user_consents`, dan `device_installations`: `auth.uid() = user_id`; `profiles` memakai `auth.uid() = id`. Consent append-only ditulis lewat RPC; installation hanya dapat dikelola pemilik atau dispatcher server dengan least privilege.
- Jangan mempercayai email, avatar, atau provider metadata untuk otorisasi.
- Log produksi hanya menyimpan kode hasil dan correlation ID; token, email, nama, URL callback lengkap, dan payload provider disensor.
- Certificate pinning tidak diwajibkan karena rotasi sertifikat berisiko; TLS valid, secure storage, RLS, dan attestation/rate limit pada endpoint sensitif menjadi kontrol utama.

## State dan error

- `booting`, `onboarding`, `signed_out`, `authenticating`, `provisioning`, `authenticated`, `offline_locked`, `reauth_required`.
- Pembatalan provider kembali ke layar masuk tanpa toast merah.
- Jaringan gagal menampilkan retry dan status koneksi; input/persetujuan lokal tetap dipertahankan.
- Callback salah menampilkan kode dukungan tanpa URL/token mentah.
- Provisioning parsial aman diulang karena RPC idempoten.
- Jika secure storage rusak, sesi lokal dibersihkan dan pengguna diminta login ulang; data server tidak dihapus.

## Analytics tanpa payload sensitif

- `onboarding_viewed { step_index, platform }`
- `onboarding_skipped { step_index }`
- `auth_started { provider, platform }`
- `auth_completed { provider, is_new_user, duration_bucket_ms }`
- `auth_failed { provider, error_class }`
- `local_unlock_result { method, result }`
- `onboarding_completed { duration_bucket_s }`

Tidak mengirim user ID Supabase, email, nama, token, provider subject, deep-link query, atau alasan biometrik detail.

## Acceptance criteria (Given–When–Then)

1. **Given** pengguna baru Android dengan jaringan aktif, **When** Google OAuth sukses dan dokumen legal disetujui, **Then** profil dibuat sekali dan pengguna masuk ke F02.
2. **Given** aplikasi iOS, **When** layar login tampil, **Then** tombol Google dan Apple tersedia serta keduanya dapat menyelesaikan sesi Supabase.
3. **Given** callback dengan nonce/state tidak valid, **When** aplikasi menerimanya, **Then** autentikasi ditolak, token tidak disimpan, dan error aman ditampilkan.
4. **Given** pengguna yang sudah login membuka aplikasi tanpa jaringan, **When** local unlock berhasil dan verifikasi terakhir belum 30 hari, **Then** snapshot lokal terbuka dengan indikator offline.
5. **Given** pengguna menekan keluar, **When** operasi selesai, **Then** token tidak lagi ada di secure storage dan route finansial tidak dapat dibuka.
6. **Given** RLS aktif, **When** user A meminta profil atau sesi user B melalui client key, **Then** hasil kosong/ditolak.
7. **Given** provisioning terputus sesudah auth user tercipta, **When** pengguna mencoba lagi, **Then** RPC menghasilkan satu profil tanpa duplikasi.

## Test matrix

| Area | Kasus minimum | Jenis |
|---|---|---|
| Google OAuth | sukses, batal, state salah, browser ditutup, jaringan putus | Unit + integrasi + perangkat nyata |
| Apple | token valid, nonce salah, nama/email hanya diberikan pertama kali | Integrasi iPhone nyata |
| Session | cold start, refresh, expired, global sign-out, secure storage rusak | Integrasi |
| Offline | cache valid, lewat 30 hari, belum pernah login | E2E |
| RLS | read/update lintas user ditolak | SQL test |
| Deep link | scheme dev, universal link prod, open redirect ditolak | Unit + E2E |
| Aksesibilitas | VoiceOver/TalkBack, dynamic type 200%, target sentuh | Manual + automated audit |
| Analytics | event ada dan tidak memuat PII/token | Contract test |

## Implementasi bertahap dan dependensi

1. **Slice 1 — Fondasi:** konfigurasi Supabase project, provider redirect, Expo Router auth group, secure session storage, migrasi `profiles` dan RLS. Dependensi: environment dev/staging/production.
2. **Slice 2 — Login nyata:** Google di Android/iOS dan Apple di iOS, callback PKCE/nonce, state/error UI, perangkat fisik.
3. **Slice 3 — Provisioning:** legal acceptance, `bootstrap_user_v1`, profile cache SQLCipher, navigasi F02.
4. **Slice 4 — Lifecycle:** refresh saat foreground, offline unlock, sign-out lokal/global, daftar sesi minimum.
5. **Slice 5 — Hardening:** RLS/SQL tests, deep-link allowlist, redaksi log, aksesibilitas, analytics contract.

Dependensi fitur: F02 memakai `profiles`; seluruh F03–F08 membutuhkan user terautentikasi, SQLCipher key, dan RLS dari fitur ini.

## Rollout dan kill switch

- Remote config: `auth_google_enabled`, `auth_apple_enabled`, `offline_unlock_enabled` dengan default aman per platform.
- Google dirilis ke internal tester, lalu 10%, 50%, 100%; Apple diuji TestFlight sebelum produksi.
- Alarm: rasio sukses auth, callback error, provisioning error, crash-free login, tanpa memantau identitas pengguna.
- Kill switch provider menyembunyikan CTA provider bermasalah hanya jika minimal satu jalur login yang sesuai kebijakan tetap tersedia; pengguna dengan sesi valid tidak dikeluarkan.
- Jika provisioning bermasalah, aktifkan mode pemeliharaan login baru dan pertahankan akses pengguna lama; rollback migrasi bersifat forward-fix, bukan menghapus tabel/data.
