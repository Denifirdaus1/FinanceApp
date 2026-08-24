# Keamanan, Privasi, dan Kepatuhan

> Status: baseline implementasi dan release gate  
> Platform: aplikasi mobile Expo SDK 56 untuk Android 10/API 29+ dan iOS 16+, EAS Build/EAS Update, Supabase Auth/Postgres/Storage/Functions  
> Target verifikasi: OWASP MASVS, dengan pengujian berbasis OWASP MASTG  
> Pemilik dokumen: Engineering + Security/Privacy Owner  
> Catatan: dokumen ini adalah spesifikasi teknis, bukan opini hukum. Legal counsel Indonesia wajib meninjau bagian kepatuhan sebelum beta publik dan sebelum peluncuran.

## 1. Tujuan dan batas produk

Dokumen ini menetapkan kontrol yang wajib dibangun, cara implementasi, bukti pengujian, serta kondisi yang harus dipenuhi sebelum aplikasi boleh dirilis. Data pemasukan, pengeluaran, anggaran, struk, dan transkrip suara diperlakukan sebagai data pribadi/keuangan sensitif walaupun pengguna memasukkannya sendiri.

### 1.1 Batas keras produk

- Aplikasi mencatat dan merangkum keuangan; aplikasi **tidak menyimpan dana, memindahkan uang, melakukan pembayaran, mengakses kredensial bank, memberi kredit, mengeksekusi investasi, atau mengirim instruksi transaksi ke lembaga keuangan**.
- Ringkasan, proyeksi, dan insight bersifat deskriptif/edukatif. Jangan menampilkan klaim sebagai nasihat investasi, pajak, kredit, atau nasihat keuangan teregulasi.
- Hasil OCR dan voice command selalu berupa draf. Pengguna harus mengonfirmasi jenis transaksi, nominal, tanggal, akun, dan kategori sebelum data disimpan.
- Integrasi rekening/bank, open finance, pembayaran, pinjaman, investasi, atau rekomendasi personal berbasis profil tidak termasuk scope. Setiap penambahan tersebut memerlukan threat model, DPIA, legal review, dan revisi store declaration baru.
- Versi awal ditujukan untuk pengguna berusia 18 tahun ke atas. Dukungan anak/remaja membutuhkan desain persetujuan wali dan legal review terpisah.

### 1.2 Prinsip wajib

1. Deny by default dan least privilege.
2. Otorisasi ditegakkan di database melalui RLS, bukan hanya UI/API.
3. Data minimum, tujuan jelas, retensi terbatas, dan penghapusan dapat dilakukan pengguna.
4. Secret tidak pernah dikirim ke aplikasi mobile atau paket OTA.
5. Semua input dari perangkat, deep link, struk, OCR, suara, dan model AI dianggap tidak tepercaya.
6. Tidak ada perubahan transaksi tanpa konfirmasi eksplisit dan operasi mutasi harus idempoten.
7. Tidak ada rilis dengan temuan Critical/High terbuka.

## 2. Ruang lingkup data dan retensi

| Kelas | Contoh | Lokasi yang diizinkan | Retensi awal | Kontrol minimum |
|---|---|---|---|---|
| S0 Publik | versi aplikasi, kategori bawaan | bundle/CDN | selama versi didukung | integritas build/OTA |
| S1 Internal | feature flag, metrik agregat tanpa identitas | server observability | 30 hari | akses berbasis peran |
| S2 Pribadi | nama tampilan, email OAuth, household membership, locale/timezone dan user preferences | Supabase Auth/Postgres | selama akun aktif; hapus sesuai alur deletion | owner-only RLS, TLS, audit |
| S3 Keuangan sensitif | transaksi, saldo manual, anggaran, tujuan, recurring item | Postgres | hingga dihapus pengguna/akun, sesuai kewajiban yang tervalidasi legal | RLS tenant, backup terenkripsi, ekspor terkontrol |
| S3 Dokumen | raw image/OCR draft; normalized confirmed receipt; optional kept image | raw hanya sandbox + SQLCipher perangkat; confirmed metadata di Postgres; image di private Storage hanya setelah confirm + keep-image | raw lokal hapus saat confirm/cancel atau max 24 jam; confirmed mengikuti entry/attachment | on-device OCR, no-network test, validasi file, signed URL |
| S3 Suara | raw audio/transcript/intent draft; confirmed provenance minimum | raw hanya sandbox + SQLCipher perangkat; provenance tanpa transcript di Postgres setelah confirm | raw lokal hapus saat confirm/cancel atau max 24 jam; confirmed mengikuti entry | permission JIT, on-device STT/parser, tanpa server audio/transcript |
| S4 Secret | service role/secret key, OAuth client secret, signing key, provider API key | secret manager/server/CI protected environment | rotasi maksimum 90 hari bila didukung, segera saat terindikasi bocor | tidak ada di client/log/repo |
| Audit keamanan | login, denial, ekspor, deletion, perubahan peran | append-only log store | 180 hari; perubahan data kritis 365 hari | pseudonimisasi, immutable, akses terbatas |
| Backup | snapshot database dan objek | storage backup terpisah | seluruh salinan yang memuat akun kedaluwarsa paling lambat Day 30 sejak original deletion request, kecuali kewajiban sah terdokumentasi | terenkripsi, restore-tested, deletion tombstone diterapkan saat restore |

Retensi tersebut adalah baseline produk. Legal counsel harus menyetujui matriks final, dasar pemrosesan, pengecualian retensi, lokasi pemrosesan, serta transfer lintas negara. Retensi tidak boleh diperpanjang hanya karena teknis atau analytics.

## 3. Threat model

### 3.1 Aset utama

- Session/refresh token dan identitas OAuth.
- Catatan transaksi, saldo, anggaran, tujuan, dan data household.
- Struk/hasil OCR dan audio/transkrip draft lokal, normalized confirmed capture, ekspor CSV/JSON/PDF.
- Secret server, signing key aplikasi/OTA, database migration, dan pipeline rilis.
- Audit trail, backup, serta kemampuan pemulihan akun/data.

### 3.2 Aktor dan trust boundary

- Pengguna sah, anggota household, role `owner`/`admin`/`member`/`viewer`, dan mantan anggota.
- Penyerang tanpa akun, akun berbahaya, perangkat hilang/rooted, atau anggota household yang menyalahgunakan akses.
- Mobile app dan OS; browser/Google/Apple OAuth; deep-link boundary.
- Supabase Auth, API, Postgres, Storage, dan server function.
- Engine OCR/STT lokal; penyedia cloud OCR/STT/AI hanya trust boundary kandidat Phase 5; crash reporting, analytics, serta jaringan publik.
- Git provider, dependency registry, EAS Build/Update, App Store, dan Google Play.
- Operator/support internal dan pihak yang memperoleh secret secara tidak sah.

### 3.3 Ancaman, kontrol, dan acceptance gate

| ID | Skenario | Dampak | Kontrol wajib | Acceptance gate |
|---|---|---|---|---|
| T-01 | Perangkat hilang atau token dicuri | pembacaan/ubah data pengguna | Keychain/Keystore, session revocation, app-switcher privacy, re-auth aksi kritis | token tidak muncul di filesystem/log; logout/revoke memutus sesi uji |
| T-02 | OAuth CSRF, code interception, atau deep-link hijack | account takeover | Authorization Code + PKCE S256, `state`, `nonce`, callback allowlist, universal/app link | callback salah host/path/state ditolak; code tidak dapat dipakai dua kali |
| T-03 | IDOR/cross-household query | kebocoran catatan keuangan | RLS seluruh tabel/Storage, role matrix, deny by default | suite dua household membuktikan seluruh CRUD/RPC/storage lintas tenant gagal |
| T-04 | `service_role`/secret key masuk bundle | bypass seluruh RLS | secret server-only, secret scanning, rotasi, environment terpisah | scan source, sourcemap, APK/IPA, dan OTA artifact tidak menemukan secret |
| T-05 | File struk berbahaya/path traversal/decompression bomb | RCE, DoS, data leak | decode/re-encode lokal, upload pasca-konfirmasi, quarantine, magic-byte validation, limit ukuran/pixel/halaman, nama acak, PDF parser sandbox | corpus file jahat ditolak tanpa dipublikasikan |
| T-06 | OCR/prompt injection dari teks struk | manipulasi hasil/model/tool | teks OCR diperlakukan sebagai data, schema output ketat, tanpa tool finansial, konfirmasi pengguna | string instruksi dalam struk tidak mengubah system behavior atau membuat transaksi otomatis |
| T-07 | Voice salah dengar/replay/double submit | transaksi keliru/duplikat | review screen wajib, confidence UI, idempotency key, uniqueness server | retry/replay menghasilkan tepat satu draf/transaksi setelah konfirmasi |
| T-08 | Abuse upload/auth/API dan resource exhaustion engine capture lokal | biaya dan availability | server rate limit/quota/timeout/body limit; local duration/file/model limit + cancellation | uji burst menghasilkan `429`; malformed capture tidak membekukan aplikasi |
| T-09 | Dependency atau pipeline/OTA dikompromikan | distribusi kode jahat | pinned dependencies/actions, review, SBOM, signed build/OTA, protected production channel | artifact unsigned/tampered ditolak; rollback OTA berhasil diuji |
| T-10 | Operator/support menyalahgunakan akses | kebocoran massal | no standing admin data access, break-glass, MFA, audit immutable | akses support memerlukan approval dan menghasilkan alert/audit |
| T-11 | Data bocor melalui log, analytics, clipboard, cache, backup | paparan sensitif | allowlist telemetry, redaction, cache cleanup, backup access controls | canary secrets/PII tidak muncul dalam log/analytics/crash report |
| T-12 | Penghapusan/consent gagal diterapkan | pelanggaran hak pengguna/store | privacy center, consent ledger, deletion workflow, processor propagation | deletion E2E menghapus primary data dan menjadwalkan expiry backup |
| T-13 | Root/jailbreak/reverse engineering | ekstraksi data/config | platform secure storage, signed artifacts, tamper signal, minimisasi client | aplikasi tidak mengandung secret; tamper hanya risk signal, bukan satu-satunya kontrol |
| T-14 | Mantan anggota household masih mengakses data | kebocoran setelah revoke | membership status atomik, JWT refresh/revocation, RLS membaca membership aktif | akses hilang maksimum satu request setelah perubahan membership |

Threat model ditinjau ulang setiap fitur baru, perubahan data flow/provider, insiden, dan minimal setiap 6 bulan.

## 4. Baseline OWASP MASVS

Targetnya adalah memenuhi kontrol relevan OWASP MASVS untuk aplikasi consumer finance, lalu memverifikasinya dengan test case MASTG. Profil pengujian final ditetapkan berbasis risiko; penyebutan MASVS tidak boleh dipasarkan sebagai sertifikasi tanpa audit independen.

| Grup | Implementasi minimum | Bukti/gate |
|---|---|---|
| MASVS-STORAGE | token hanya di Keychain/Keystore melalui secure storage; cache/temp sensitif dibersihkan; tidak ada data S3 di AsyncStorage/plain file; backup OS mengecualikan token/cache; app-switcher snapshot dikaburkan | inspeksi filesystem perangkat, backup extraction, screenshot/background test |
| MASVS-CRYPTO | TLS 1.2+ (1.3 preferred); algoritma/provider platform; tanpa crypto buatan sendiri; entropy CSPRNG; key inventory dan rotasi; encryption-at-rest provider tervalidasi | config review, TLS scan, secret/key rotation drill |
| MASVS-AUTH | Google OAuth; Sign in with Apple sebagai opsi setara di iOS; PKCE/state/nonce; secure session; re-auth aksi kritis; RLS per request | OAuth negative tests, session revoke tests, RLS/IDOR suite |
| MASVS-NETWORK | HTTPS only, hostname/certificate validation OS, timeout/retry terbatas, tanpa cleartext traffic, payload minimum | MITM test memastikan sertifikat invalid ditolak; Android network policy/iOS ATS review |
| MASVS-PLATFORM | permission just-in-time; exact deep-link handling; share sheet OS; notifikasi tidak berisi nominal/detail sensitif secara default; app-switcher privacy | permission/deep-link/notification tests pada iOS dan Android |
| MASVS-CODE | schema validation, safe errors, dependency hygiene, debug off, signed OTA, runtime version compatibility, supported-version policy | SAST, dependency scan, artifact inspection, OTA rollback test |
| MASVS-RESILIENCE | store signing, EAS Update code signing, protected production channel, integrity/tamper telemetry; root/jailbreak hanya sinyal | tampered artifact/update ditolak; signing access review |
| MASVS-PRIVACY | minimisasi, consent kontekstual, purpose limitation, retention/deletion, permission disclosure, privacy label/Data safety akurat | data inventory vs network capture vs store disclosure tidak memiliki selisih |

**Gate MASVS:** seluruh requirement mempunyai owner, test ID, evidence URL, dan hasil pass. Deviasi harus mempunyai risk acceptance tertulis, compensating control, expiry date, dan persetujuan Security Owner; Critical/High tidak boleh dikecualikan untuk rilis.

## 5. Authentication dan session

### 5.1 Provider dan flow

- Gunakan Supabase Auth dengan Google untuk Android/iOS dan Sign in with Apple sebagai opsi login setara di iOS. Scope default hanya `openid email profile`; scope tambahan memerlukan tujuan dan consent baru.
- Gunakan system browser/authentication session, bukan embedded WebView. Flow native adalah OAuth Authorization Code + PKCE S256.
- Generate `code_verifier`, `state`, dan `nonce` dengan CSPRNG per percobaan. Simpan sementara di secure storage/memory, hapus setelah sukses/gagal/timeout, dan jangan log nilainya.
- Callback production memakai universal link/app link pada domain terverifikasi. Custom scheme hanya fallback yang didokumentasikan. Handler menerima exact scheme, host, dan path `/auth/callback`; semua callback lain ditolak.
- Redirect URL harus masuk allowlist per environment. Parameter `next`/redirect dari client tidak boleh menjadi URL arbitrer.
- Callback hanya menerima authorization code, melakukan pertukaran satu kali, memvalidasi `state`/`nonce`/issuer/audience, lalu menghapus URL sensitif dari history/log.
- Jangan melakukan account linking hanya karena alamat email sama. Linking memerlukan email terverifikasi dari provider dan re-auth pada kedua identitas atau flow server yang eksplisit.
- Sign in with Apple harus menangani private relay email dan menyimpan nama hanya saat pertama kali provider memberikannya.

### 5.2 Penyimpanan dan siklus session

- Access/refresh token hanya di secure storage berbasis iOS Keychain/Android Keystore; tidak di AsyncStorage, SQLite plaintext, clipboard, crash breadcrumb, analytics, atau notification payload.
- Access token maksimal 60 menit. Aktifkan refresh token rotation dan reuse detection. Reuse atau logout-all mencabut seluruh session terkait.
- Logout menghapus token lokal, cache S2/S3, pending PKCE state, dan merevoke session server. Penghapusan akun juga merevoke token provider bila diwajibkan, termasuk Sign in with Apple.
- Re-auth maksimal 5 menit sebelum ekspor seluruh data, penghapusan akun, transfer owner household, perubahan provider/login, atau membuka recovery codes jika kelak ada.
- Background/foreground tidak pernah menampilkan data sensitif di app-switcher. Optional biometric app lock hanya lapisan lokal, bukan pengganti autentikasi server.
- Email/provider change, recovery, dan login perangkat baru memicu notifikasi generik tanpa detail keuangan.

### 5.3 Acceptance gate auth

- [ ] Login Google berhasil pada build store Android dan iOS; Sign in with Apple berhasil pada perangkat iOS nyata.
- [ ] Cancel, expired code, wrong `state`, wrong `nonce`, wrong audience, replayed code, dan callback dari domain/scheme lain gagal dengan aman.
- [ ] Deep-link fuzzing tidak menyebabkan open redirect, token leakage, crash, atau navigasi ke layar terotorisasi.
- [ ] Token tidak ditemukan melalui device backup, logs, screenshot, source map, APK/IPA, dan bundle OTA.
- [ ] Logout, logout-all, revoke membership, dan account deletion menghentikan request berikutnya.
- [ ] Daftar redirect di Supabase, Google, Apple, Android app link, dan iOS associated domains identik dengan environment yang aktif.

## 6. Authorization dan isolasi household dengan Supabase RLS

### 6.1 Model tenant

- `auth.users.id` menjadi identitas server; jangan menerima `user_id` atau role dari body sebagai sumber kebenaran.
- Semua record bersama memiliki `household_id`; record personal memiliki `user_id`. Tidak boleh ada record bisnis tanpa salah satu scope tersebut.
- `household_members(household_id, user_id, role, status)` adalah sumber kebenaran membership. Role: `owner`, `admin`, `member`, `viewer`; hanya `status = 'active'` memberi akses.
- Jangan memakai `raw_user_meta_data`/user-editable metadata untuk otorisasi. Jika JWT claims digunakan sebagai cache, RLS tetap memvalidasi membership aktif di database untuk revoke yang cepat.
- Semua tabel pada schema yang diekspos mengaktifkan RLS. Revoke privilege default dari `anon`; grant hanya operasi yang memang dibutuhkan.
- View menggunakan `security_invoker` bila diekspos. RPC/function mempunyai grant eksplisit; `SECURITY DEFINER` hanya jika wajib, dengan fixed empty `search_path`, fully-qualified object, owner non-login, dan unit test otorisasi.

### 6.2 Matriks kebijakan

| Resource | SELECT | INSERT/UPDATE | DELETE/aksi khusus |
|---|---|---|---|
| `households` | anggota aktif | owner; field allowlist | owner melalui workflow ter-audit |
| `household_members` | anggota aktif household yang sama | owner; invitation acceptance via server function | owner atau self-leave; sole owner wajib transfer/delete household |
| `financial_entries`/`entry_splits`/`entry_tags` | projection hanya untuk anggota aktif yang lolos `read` pada **semua** account lines parent; draft tanpa line hanya creator | direct base-table mutation ditolak; RPC memerlukan role writer + `write` pada semua account lines dan menurunkan signed effects server-side | void/reversal via RPC ter-audit; denied line menyembunyikan seluruh header/children |
| `attachments`/`receipt_extractions`/voice provenance pada `financial_entries.source_metadata` | mengikuti all-account permission entry parent | hanya RPC; capture metadata setelah confirm, attachment hanya setelah `keep_image=true` | delete mengikuti entry/attachment; tidak ada server draft/raw OCR/audio/transcript atau tabel voice session Supabase |
| `categories`/`budgets` | anggota aktif; viewer read-only | owner/admin/member | sesuai role dan aturan produk |
| `recurring_rules`/`recurring_occurrences` | anggota aktif dan permission semua account yang ditautkan | owner/admin/member dengan permission account terkait | template/link tidak boleh membocorkan account terlarang |
| `goals`/`goal_contributions` | household-wide bila tidak tertaut account; bila tertaut wajib lolos permission account/entry | owner/admin/member dengan permission pada link terkait | link tidak boleh membocorkan account terlarang |
| `import_jobs`/`import_rows` | sebelum mapping creator-only; setelah mapping wajib permission setiap account | creator berizin; processing server tetap re-check saat commit | revoke mem-purge row, source object, duplicate hint, dan draft |
| `merchants` | household scope untuk reference eksplisit; account scope wajib permission | writer berizin; promote ke household scope hanya owner/admin | OCR/import default account scope; usage signal global dilarang |
| `accounts` manual bersama | anggota aktif yang lolos `account_permissions` | owner/admin/member dengan izin write | owner/admin atau permission manage; tidak pernah menyimpan bank credential |
| `profiles` | user sendiri; co-member hanya view tereduksi nama/avatar | user sendiri dengan field allowlist | account-deletion workflow |
| `user_preferences` | hanya pemilik row (`user_id = auth.uid()`) melalui direct select/RPC | direct Data API insert/update/delete ditolak; `update_user_preferences_v1` hanya pemilik row + expected version | account-deletion workflow; tidak pernah terlihat anggota household |
| record personal | hanya `user_id = auth.uid()` | hanya user terkait | hanya user terkait melalui workflow |
| invite | owner; penerima hanya token valid yang cocok | server-only issue/accept; token single-use + expiry | owner revoke |
| audit | owner membaca event household yang telah diredaksi | trigger/server-only append | tidak ada update/delete dari client |
| `storage.objects` attachment | hanya object dengan metadata tertaut entry dan all-account read permission | signed upload terikat `uploaded_by`, posted entry, `keep_image=true`, attachment, dan path quarantine | delete mengikuti metadata/izin account; server memindah hasil validasi |

Implementasi policy ledger harus memakai pola setara `EXISTS` pada `household_members` dengan `(select auth.uid())`, `status = 'active'`, `household_id` record, dan role yang sesuai untuk `USING` serta `WITH CHECK`. Index wajib tersedia pada `(household_id, user_id, status)` dan setiap foreign key/predicate RLS utama.

Sync tidak boleh melemahkan RLS: `pull_changes_v1` dan full sync memfilter membership serta `account_permissions` pada setiap payload dan hanya mengirim ledger entry bila seluruh account lines dapat dibaca. `pull_user_changes_v1` memakai cursor terpisah dan hanya mengembalikan row/event dengan `subject_user_id = auth.uid()`, termasuk `user_preferences`; tidak ada preference di household channel, Realtime topic, atau export anggota lain. Login/resume/reconnect mengambil access manifest authoritative sebelum membaca cache. Revoke satu account atau membership mengirim directive purge khusus user; client wajib menghapus header, seluruh splits/tags, attachment/capture metadata, merchant/suggestion/import reference, query cache, draft, serta outbox yang tidak lagi berwenang. Test wajib mencakup transfer dua account lalu deny salah satu (tidak boleh partial/leak count), member suspended/left, full sync setelah revoke, cross-user preference cursor, dan perangkat yang lama offline.

Purge cache parsial menjalankan secure delete, membersihkan preview/temp file, WAL checkpoint + truncate, dan compact/vacuum agar page lama tidak dapat dipulihkan memakai key SQLCipher yang masih aktif. Purge seluruh user menutup lalu menghapus database dan SecureStore key; test forensic memeriksa database, WAL/SHM, cache, backup OS, serta app-switcher snapshot.

View, summary, dashboard, budget actual, goal progress, net worth, count, dan category/merchant breakdown menerapkan permission account **sebelum** agregasi. Respons untuk user dengan akses parsial menandai bahwa hasil tidak mencakup seluruh household dan tidak boleh membocorkan count/total dari account tersembunyi.

Permission account tidak boleh menaikkan akses di atas ceiling household role: owner/admin maksimal manage, member maksimal write, viewer maksimal read. Account mode restricted menolak non-owner tanpa grant eksplisit; deny selalu menang; owner tetap manage agar tidak terjadi orphaned authorization.

`user_preferences` adalah setting presentasi/default pribadi, bukan otorisasi atau consent. Masking/theme/notification default tidak boleh menonaktifkan app-switcher redaction, secure storage, rate limit, audit, atau notifikasi keamanan wajib. Analytics/marketing consent tetap di `user_consents`. Household base currency, timezone, week start, dan budget start authoritative untuk perhitungan bersama; nilai user hanya presentation/default awal.

### 6.3 Service role dan operasi admin

- **`service_role`/Supabase secret key membypass RLS dan hanya boleh digunakan server-side** di trusted function/job. Mobile app hanya memakai Supabase publishable key (atau legacy anon key) bersama session pengguna dan RLS.
- Tidak ada endpoint umum yang meneruskan query, table name, filter, storage path, atau role dari client ke operasi service-role tanpa allowlist dan otorisasi ulang.
- Job service-role menyertakan actor, reason, request ID, tenant scope, dan audit event. Untuk operasi pengguna, lebih baik gunakan JWT pengguna agar RLS tetap aktif.
- Support/admin tidak mempunyai akses permanen ke data S3. Break-glass memerlukan MFA, approval kedua, scope/waktu terbatas, alert real-time, dan review setelah penggunaan.

### 6.4 Acceptance gate RLS

- [ ] pgTAP/integration test menjalankan `anon`, user A household A untuk viewer/member/admin/owner, user B household B, suspended/left user, dan expired invite terhadap setiap tabel, view, RPC, Realtime subscription, serta Storage.
- [ ] Account-denied user yang mengetahui UUID entry gagal melalui direct Data API, RPC, view, Realtime, delta/full sync, attachment, serta goal/contribution yang tertaut.
- [ ] Account-denied user juga gagal membaca import job/row/source file, merchant account-scoped, duplicate hint, recent-use/count, dan suggestion derived dari account tersembunyi.
- [ ] User A gagal select/mutate `user_preferences` user B melalui direct Data API, RPC, guessed UUID, Realtime, user-sync cursor, export, dan member profile view; direct preference mutation juga ditolak untuk user A sendiri selain lewat RPC versioned.
- [ ] Concurrent preference edits menghasilkan version conflict/rebase, bukan lost update; logout/delete akun menghapus SQLite mirror dan server row sesuai lifecycle.
- [ ] Semua cross-tenant `SELECT/INSERT/UPDATE/DELETE`, guessed UUID, nested relation, bulk upsert, dan signed URL tidak mengungkap atau mengubah data.
- [ ] Membership revoke bersifat atomik dan menutup realtime/storage/API pada request berikutnya.
- [ ] Migration baru gagal di CI bila tabel exposed tidak memiliki RLS/policy test.
- [ ] Scan artifact membuktikan publishable key saja yang ada di client; tidak ada service-role/secret/provider key.

## 7. Secrets, kriptografi, dan konfigurasi

- Anggap seluruh nilai `EXPO_PUBLIC_*`, JS bundle, native binary, source map, dan OTA asset sebagai publik. Hanya URL Supabase, publishable key, app identifier, dan non-sensitive feature config boleh berada di sana.
- Simpan service-role/secret key, OAuth client secret, webhook secret, database credential, serta calon OCR/STT/AI key Phase 5 hanya di Supabase secrets atau secret manager server yang sesuai. Phase 2 tidak mempunyai provider key OCR/STT. EAS protected credentials hanya untuk credential signing/build yang memang diperlukan EAS; secret backend tidak boleh diinjeksi ke JS/native build. Jangan commit `.env` berisi nilai nyata.
- Gunakan project dan credential terpisah untuk dev/staging/prod. Production secret hanya tersedia pada protected environment dan workflow production.
- Buat inventory: nama secret, sistem, owner, scope, tanggal dibuat/rotasi, expiry, dan runbook rotasi. Rotasi maksimal 90 hari bila provider mendukung dan langsung saat leak, offboarding, atau perubahan trust boundary.
- Semua koneksi memakai TLS 1.2+; TLS 1.3 diprioritaskan. Jangan menonaktifkan certificate/hostname validation. Certificate pinning tidak diwajibkan pada MVP karena risiko availability/rotation; revisi saat menambah koneksi perbankan berisiko tinggi.
- Gunakan primitives platform/provider; tidak membuat algoritma kriptografi sendiri. Data highly sensitive baru yang membutuhkan field-level encryption harus memakai envelope encryption dengan managed KMS dan rotation plan.
- Secret scanning berjalan pre-commit dan CI. Merge diblokir untuk token/provider key, private key, legacy service-role JWT, atau `sb_secret_*` yang terdeteksi.

**Gate:** rotasi service role dan satu provider key diuji di staging tanpa downtime; secret lama ditolak; build/OTA sebelumnya tidak memperoleh secret baru; owner dan tanggal bukti dicatat.

## 8. Keamanan capture lokal, upload struk opsional, dan voice command

### 8.1 Upload struk

1. Phase 2 menjalankan OCR sepenuhnya on-device. Raw image, OCR text/bounding boxes, dan draft tersimpan hanya di memory/sandbox + SQLCipher, dilarang masuk network, Supabase, backup OS, log, analytics, atau crash report, dan dihapus saat confirm/cancel atau maksimum 24 jam.
2. User wajib mengoreksi serta mengonfirmasi structured draft. `confirm_capture_v1` hanya menerima field terstruktur yang telah dikoreksi dalam `_minor` canonical integer strings; teks struk tetap untrusted data dan tidak pernah menjadi instruction/tool trigger.
3. Jika `keep_image=false` (default privacy), image/preview lokal dihapus dan tidak ada row/object server. Jika `keep_image=true`, signed upload baru boleh dibuat setelah entry terkonfirmasi dan attachment metadata sudah tertaut ke entry tersebut.
4. Aplikasi mengubah HEIC menjadi JPEG, re-encode raster, dan menghapus EXIF/GPS/thumbnail sebelum upload. Server menerima JPEG/PNG/WebP; PDF hanya bila fitur PDF diaktifkan.
5. Batas kanonis: 15 MiB/file, maksimum 20 megapiksel, sisi maksimum 12.000 px, PDF maksimum lima halaman, dan maksimum 20 file per batch. Client melakukan early reject; finalizer server memverifikasi actual bytes/decode dan tidak percaya header client.
6. Validasi extension, declared MIME, magic bytes, hasil decode, checksum, dan polyglot/mismatch. UUID server menjadi nama object; normalisasi path menolak `..`, encoded/double separator, control character, serta executable content.
7. Upload masuk `attachments-private/{household_id}/{attachment_id}/quarantine/{object_id}.{ext}`. PDF dipindai malware dan diparse sandboxed dengan timeout/memory/CPU/page limit serta egress disabled; hasil valid dipindah ke `/original/` pada attachment yang sama.
8. Tidak ada server-side unlinked attachment/draft. Metadata/object selalu mengikuti all-account permission entry parent; revoke salah satu account menutup signed URL dan memicu purge cache. Signed download URL maksimum lima menit dan tidak dicatat.
9. File gagal/partial, quarantine, dan derived server artifact dibersihkan maksimum 24 jam. Optional cloud OCR baru kandidat Phase 5: explicit opt-in per capture, vendor/feature gate, DPA/subprocessor/region/no-training, TTL terukur, deletion test, serta mode local/manual tetap tersedia; tidak boleh hidden fallback.

### 8.2 Voice command

- Minta permission mikrofon saat pengguna menekan tombol, bukan saat install/startup; tidak ada always-on recording.
- Phase 2 STT dan strict intent parser berjalan sepenuhnya on-device tanpa request cloud tersembunyi. Supabase tidak mempunyai audio bucket, `audio_path`, transcript/intent draft column, atau processor endpoint.
- Raw audio, transcript, dan intent draft hanya di memory/sandbox + SQLCipher, dilarang masuk outbox/backup/log/analytics/crash report, lalu dihapus saat confirm/cancel atau maksimum 24 jam. Transcript untrusted dibatasi 1.000 karakter; low-confidence field wajib klarifikasi/edit.
- Server menerima hanya structured corrected command setelah confirmation. Create entry memakai idempotency key terikat user + command; uang berupa `_minor` integer strings dan signed account-line effects diturunkan/dites server.
- Optional cloud STT hanya kandidat Phase 5 dengan explicit opt-in per capture, disclosure/consent versioned, vendor gate, DPA/subprocessor/region/no-training, enforced TTL + deletion verification, serta input manual/on-device tetap tersedia; tidak boleh hidden fallback.

### 8.3 Gate media

- [ ] Corpus mencakup wrong MIME, renamed executable, malformed image/PDF, zip/polyglot, >15 MiB, >20 MP, sisi >12.000 px, 6+ halaman, EXIF GPS, path traversal, parser timeout, dan malware test file.
- [ ] Tidak ada objek quarantine yang dapat dibaca langsung oleh user lain atau public URL.
- [ ] OCR/voice prompt injection dan replay tidak dapat menyimpan transaksi tanpa review/confirm.
- [ ] Network capture membuktikan Phase 2 OCR/STT/parser tidak mengirim raw image/OCR/audio/transcript/intent dan tidak mempunyai server endpoint/hidden cloud fallback; `confirm_capture_v1` hanya menerima corrected structured fields.
- [ ] Tidak ada attachment row/object sebelum confirmation + keep-image; server menolak upload untuk entry/account yang tidak lagi berizin.
- [ ] Delete transaksi/akun menghapus objek aktif dan derived artifact; backup expiry tercatat.

## 9. API security, validasi, abuse prevention, dan idempotensi

- Semua endpoint private memvalidasi JWT, issuer, audience, expiry, dan user status; fungsi sensitif menolak anonymous. Webhook memakai signature + timestamp + replay window, bukan JWT publik.
- Gunakan schema allowlist (misalnya Zod) pada body/query/path/response. Tolak unknown privileged fields seperti `user_id`, `household_id` yang tidak cocok, `role`, `is_admin`, `created_by`, dan storage path.
- Body limit default 256 KiB untuk JSON; upload memakai endpoint khusus dengan batas media di atas. OCR/STT Phase 2 tidak mempunyai server timeout karena berjalan lokal; engine lokal wajib duration/memory limit dan cancellation.
- Mutasi dari offline sync, receipt, voice, recurring job, dan retry jaringan memakai idempotency key + database unique constraint. Uang hanya `_minor bigint` + currency dan wire integer string. Saldo diturunkan hanya dari signed account `entry_splits`, category report hanya positive category lines, dan header presentation amount tidak pernah diagregasi.
- Error client generik dengan stable code dan correlation ID. Stack trace, SQL, policy name, provider response, atau keberadaan email tidak dikirim ke client.
- CORS web/ops memakai exact allowlist dan tidak memakai wildcard dengan credentials. Mobile tidak dianggap bypass keamanan karena CORS bukan kontrol otorisasi.

### 9.1 Starting rate limits

| Operasi | Limit awal | Key/scope | Respons |
|---|---:|---|---|
| login/OAuth start dan callback gagal | 10/menit/IP; 5 gagal/15 menit/account fingerprint | IP + account + device risk | generic error, exponential backoff |
| transaksi write/sync | 60/menit/user; burst 20 | user + household | `429`, `Retry-After`, tidak partial commit |
| receipt upload | 10/10 menit/user; 100/hari/household | user + household + byte quota | signed upload ditolak sebelum transfer |
| invite | 10/hari/household; 3/hari/email target | owner + target hash | anti-enumeration response |
| full export | 3/jam/user | user | recent re-auth, one active job |
| account deletion | 1 active request/account | user | idempotent status endpoint |

Limit disimpan sebagai config server, dapat diturunkan saat insiden, dan dimonitor untuk false positive. IPv6 prefix handling, proxy trusted chain, dan distributed limiter diuji. Quota tidak boleh menjadi satu-satunya pertahanan terhadap query mahal; query juga dibatasi, diindeks, dan memiliki timeout. Engine OCR/STT lokal dibatasi durasi/input/memory pada perangkat, bukan memakai server cost quota. Jika cloud capture Phase 5 disetujui, rate/cost/circuit-breaker table baru wajib ditetapkan sebelum enable.

**Gate:** load/burst/replay test membuktikan limiter konsisten pada beberapa instance, response memiliki `Retry-After`, request yang ditolak tidak dikenai biaya processor, dan idempotency test menghasilkan tepat satu record.

## 10. Logging, audit, monitoring, dan redaction

### 10.1 Event yang dicatat

- Login/logout/revoke success/failure, OAuth anomaly, refresh token reuse, dan perubahan provider.
- Authorization/RLS denial agregat, cross-tenant attempt, perubahan owner/member/role, invite issue/accept/revoke.
- Ekspor, deletion request/progress/completion, consent change, perubahan retensi.
- Upload accepted/rejected, malware/PDF-parser failure, local capture crash/error code non-sensitif, dan rate-limit/cost anomaly. OCR/STT provider failure hanya relevan bila fitur cloud Phase 5 diaktifkan.
- Service-role/break-glass use, secret rotation, policy/migration, production deploy, EAS Update publish/rollback.

### 10.2 Yang dilarang di log/analytics/crash report

- Access/refresh token, auth code, PKCE verifier, cookie, API/service key, signed URL, Authorization header.
- Raw receipt/audio/transcript, nominal, saldo, merchant, catatan transaksi, detail tujuan/utang, alamat, email penuh, atau full IP.
- Request/response body untuk endpoint finansial, media, auth, export, atau deletion.

Gunakan structured logging dengan field allowlist: timestamp UTC, event name, environment, request ID, pseudonymous actor ID, household ID yang di-HMAC, result, reason code, app version, dan coarse device/platform. Sanitasi newline/control character. Production log append-only, encrypted in transit/at rest, akses read-only least privilege, dan perubahan retention diaudit.

### 10.3 Monitoring

- Alert Sev-1: service-role use tidak terjadwal, lonjakan cross-tenant denial, secret scan hit, malware escape, mass export, refresh-token reuse massal, RLS/policy disabled, atau signed OTA failure.
- Alert Sev-2: auth/OCR error spike, quota abuse, deletion job stalled >24 jam, backup/restore check gagal.
- Sentry/crash tool wajib memakai `beforeSend`/server scrubber dan sampling. Uji canary PII/token setiap rilis memastikan redaction di seluruh breadcrumb, tag, span, replay, dan attachment.

**Gate:** tes otomatis mengirim canary email/token/nominal dan pipeline memastikan tidak ada nilai tersebut di log, alert, analytics, trace, atau crash attachment. Audit record tidak dapat di-update/delete melalui client.

## 11. Supply chain, secure CI/CD, dan OTA update

- Commit lockfile; dependency langsung dipin dan update melalui PR ter-review. Jalankan audit dependency, license scan, SAST, secret scan, dan mobile binary analysis.
- GitHub Actions/CI action dipin ke full commit SHA. Workflow dari fork/untrusted PR tidak menerima secret dan tidak dapat publish artifact/update.
- Production branch protected: minimal satu reviewer, required checks, signed/verified commit sesuai kebijakan tim, no direct force-push, dan CODEOWNERS untuk auth/RLS/migration/release config.
- Generate SBOM CycloneDX/SPDX untuk dependency production dan simpan bersama artifact/provenance. Critical/High CVE yang reachable memblokir rilis; exception membutuhkan owner, compensating control, dan expiry.
- Build bersih dari runner ephemeral. Credential production hanya tersedia pada protected environment dengan approval dan least privilege; tidak dicetak ke log/cache/artifact.
- EAS/Apple/Google/Supabase accounts wajib MFA, role minimum, quarterly access review, dan immediate offboarding.

### 11.1 Gate pipeline minimum

1. Format/lint, typecheck, unit/integration tests, migration lint, dan RLS/pgTAP suite.
2. Secret/SAST/dependency/license scan dan SBOM.
3. Build Android/iOS reproducible-enough dengan commit SHA, dependency lock hash, build profile, dan provenance.
4. Mobile artifact scan memastikan debug menu, test endpoint, source secret, dan service-role tidak ada.
5. E2E smoke pada staging dan security regression untuk OAuth/deep link/RLS/upload/deletion.
6. Manual approval production oleh orang selain author untuk app-store build dan OTA publish.

### 11.2 EAS Update/OTA

- Aktifkan EAS Update code signing. Production hanya menerima manifest/update bertanda tangan valid dan channel production tidak dapat ditulis dari developer workstation biasa.
- Tetapkan `runtimeVersion` yang kompatibel; perubahan native permission, native module, encryption capability, atau store-regulated behavior harus melalui App Store/Play build, bukan OTA.
- OTA hanya mengubah JS/assets dalam batas store policy; tidak mengunduh/mengeksekusi kode arbitrer dari sumber lain dan tidak menyamarkan perubahan fungsi inti dari review store.
- Gunakan staged rollout, health metric, kill switch, version floor, dan satu-command rollback yang diuji di staging setiap kuartal.
- Signing private key tidak berada di repo atau JS runtime. Public certificate boleh dibundel untuk verifikasi.

**Gate OTA:** update unsigned, wrong runtime/channel, expired key, dan modified bundle ditolak; rollback mengembalikan versi sehat tanpa merusak schema/offline queue; evidence disimpan per release.

## 12. Privasi, consent, hak data, dan kepatuhan store

### 12.1 Privacy by design

- Buat data-flow inventory yang memetakan field → tujuan → dasar pemrosesan → lokasi → processor → retensi → deletion path → store disclosure.
- Privacy notice tersedia sebelum signup dan dari Settings, dalam Bahasa Indonesia yang jelas; versi, tanggal efektif, identitas pengendali, tujuan, data, sharing, retention, rights, kontak, transfer, serta complaint channel dicatat.
- Consent tidak dibundel. Analytics non-esensial, komunikasi pemasaran, serta optional cloud OCR/STT Phase 5 memiliki toggle/opt-in terpisah, default off, bukti versi/timestamp, dan dapat ditarik semudah memberi consent. Phase 2 capture tetap on-device tanpa cloud fallback.
- Jangan memakai IDFA/cross-app tracking atau ad SDK pada baseline. Jika kelak digunakan, lakukan legal/privacy review dan Apple ATT sebelum tracking.
- Processor aktif (Supabase, analytics yang diizinkan, crash reporting, email) harus mempunyai DPA, subprocessor list, region/transfer assessment, retention/no-training configuration bila relevan, security review, dan deletion API/SLA. OCR/STT/AI vendor baru masuk daftar setelah gate Phase 5 dan tidak boleh menerima data sebelumnya.
- Permission kamera, photo library, microphone, notification, dan biometrik diminta just-in-time dengan purpose string yang sesuai perilaku nyata. Denial tidak memblokir input manual.

### 12.2 UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi

UU 27/2022 PDP adalah baseline legal review Indonesia, bukan satu-satunya kewajiban. Sebelum beta publik, counsel harus memvalidasi setidaknya:

- status dan identitas Pengendali/Prosesor Data Pribadi, dasar pemrosesan tiap tujuan, bukti consent, kontrak processor, transfer lintas negara, serta kebutuhan penunjukan petugas/fungsi PDP;
- pemenuhan hak subjek: informasi, akses, koreksi/pembaruan, salinan/portabilitas bila berlaku, penghentian/pembatasan, penarikan consent, keberatan terhadap keputusan otomatis, serta penghapusan/pemusnahan sesuai hukum;
- proses DPIA untuk pemrosesan berisiko tinggi, termasuk data finansial detail, household sharing, OCR/STT/AI, profiling, atau pemrosesan skala besar;
- kewajiban Pasal 46: jika terjadi kegagalan pelindungan data, siapkan pemberitahuan tertulis maksimal **3 x 24 jam** kepada subjek data dan lembaga, dengan data yang terungkap, waktu/cara kejadian, serta upaya penanganan/pemulihan. Legal menentukan trigger dan penerima final.

Target operasional internal: request hak diakui ≤24 jam dan identitas diverifikasi dengan data minimum. Delete akun mempunyai grace tepat 7 hari sejak original `requested_at`; setelah grace berakhir, purge active data dimulai otomatis dan diselesaikan ≤24 jam, processor menerima perintah ≤24 jam, dan seluruh salinan backup yang memuat akun kedaluwarsa paling lambat **Day 30 sejak original request**. Recovery 30 hari untuk `financial_entries` yang di-soft-delete adalah fitur terpisah dan tidak boleh menunda purge akun. Jika hukum mensyaratkan lebih cepat, hukum mengalahkan target ini.

### 12.3 Privacy Center dan account deletion

Privacy Center menyediakan:

- lihat/correct profile, `user_preferences`, dan household membership sesuai hak;
- unduh data dalam JSON/CSV yang machine-readable setelah recent re-auth;
- kelola consent dan permission;
- hapus kept receipt/confirmed capture metadata serta bersihkan draft media lokal; Phase 2 tidak menyimpan server audio/transkrip;
- request account deletion, status, grace/cancellation window tepat 7 hari, dan bukti selesai;
- tautan privacy notice, processor list, retensi, serta kontak privacy/security.

Deletion workflow:

1. Re-auth dan explicit confirmation; jangan mengandalkan email/support sebagai satu-satunya jalur.
2. Revoke session/provider token dan hentikan processing/notification segera.
3. Tangani household tanpa mengunci hak: sole owner dapat transfer ownership atau menghapus household; pilihan dan konsekuensi shared records dijelaskan sebelum konfirmasi.
4. Hapus/anonymize Auth identity, profile, `user_preferences`, private records, kept receipt/normalized capture metadata, device token, analytics identity, dan processor data. Phase 2 raw capture seharusnya sudah device-only/ber-TTL; shared ledger hanya boleh dipertahankan secara teredaksi bila ada dasar sah yang telah disetujui legal dan dijelaskan sebelumnya.
5. Tombstone deletion berisi request ID/status tanpa PII; seluruh backup yang memuat akun kedaluwarsa paling lambat Day 30 sejak original request dan tidak boleh menghidupkan akun saat restore.
6. Re-registration tidak boleh menghubungkan kembali data lama kecuali pengguna secara eksplisit memulihkannya sebelum completion.

### 12.4 App Store dan Google Play

**Apple:**

- Karena Google dipakai untuk primary account, sediakan Sign in with Apple sebagai opsi setara di iOS sesuai App Review Guideline 4.8, kecuali legal/store review mendokumentasikan exception yang benar-benar berlaku.
- Sediakan account deletion di dalam aplikasi; jangan mengharuskan telepon/email. Re-auth/confirmation wajar, tetapi alur tidak boleh sengaja dipersulit. Revoke Sign in with Apple token saat akun dihapus.
- App Privacy details harus mencerminkan email/identifier, financial info, kept receipt, diagnostics, dan penggunaan processor/SDK sebenarnya. Audio/transcript Phase 2 diproses on-device dan tidak dikumpulkan; deklarasi wajib berubah sebelum cloud STT diaktifkan.
- Privacy manifest dan Required Reason API declarations harus cocok dengan binary/SDK. App Review memperoleh demo account/mode aman dan backend aktif tanpa memberikan data produksi.

**Google Play:**

- Data safety form dan privacy policy harus sama dengan network/data-flow inventory, termasuk SDK pihak ketiga, encryption in transit, sharing, retention, dan deletion.
- Jika akun dapat dibuat, sediakan deletion di aplikasi **dan** halaman web publik yang berfungsi, jelas menyebut nama aplikasi/developer, serta memungkinkan request tanpa memasang ulang aplikasi.
- Lengkapi deklarasi fitur finansial sesuai fungsi aktual. Nyatakan dengan tepat bahwa aplikasi hanya budgeting/expense tracking bila memang demikian; jangan menandai money transfer, lending, banking, investment, atau financial advice yang tidak tersedia.
- Data/permission declarations, content rating, target API, dan foreground/background behavior harus sesuai binary aktual.

**Gate store/privacy:** tidak ada perbedaan antara data inventory, proxy/network capture, SDK scan, privacy notice, Apple privacy details, Google Data safety, permission prompts, dan deletion behavior. Privacy Owner serta legal counsel memberi sign-off bertanggal.

## 13. Backup, disaster recovery, dan business continuity

### 13.1 Sasaran

| Tahap | RPO | RTO | Syarat |
|---|---:|---:|---|
| internal/beta tertutup | ≤24 jam | ≤8 jam | backup harian + restore runbook |
| produksi publik | ≤1 jam | ≤4 jam | PITR/backup setara, monitoring, on-call, restore drill lulus |

- Backup database dan Storage diverifikasi terpisah; jangan mengasumsikan backup database mencakup objek struk.
- Backup terenkripsi, aksesnya terpisah dari akses aplikasi harian, tidak public, dan menggunakan credential/role khusus. Restore dilakukan ke environment terisolasi tanpa mengirim email/push/processor job.
- Snapshot/backup rolling dikonfigurasi agar seluruh salinan yang memuat data akun kedaluwarsa paling lambat Day 30 sejak original deletion request, bukan 30 hari setelah purge, kecuali kewajiban sah yang spesifik dan terdokumentasi. Deletion tombstone memastikan data yang direstore kembali dihapus sebelum environment dipakai.
- Uji checksum/backup completion harian, sample restore bulanan, dan full disaster restore kuartalan. Catat waktu, record count, referential integrity, RLS status, Storage manifest, serta RPO/RTO aktual.
- Runbook mencakup kehilangan region/provider, corrupt migration, accidental delete, compromised credential, malicious OTA, dan processor outage. Ekspor backup lintas provider hanya setelah transfer/privacy review.

**Gate produksi:** full restore terbaru berhasil di environment terisolasi, seluruh RLS/policy aktif setelah restore, signed URLs lama tidak berlaku, deletion tombstone diterapkan, serta RPO/RTO terukur memenuhi target.

## 14. Incident response

### 14.1 Severity dan target internal

| Severity | Contoh | Acknowledge | Target containment awal |
|---|---|---:|---:|
| Sev-1 | cross-tenant leak, service-role/signing key bocor, mass account takeover, malware/OTA compromise | ≤30 menit | ≤4 jam |
| Sev-2 | kebocoran terbatas, abuse biaya besar, deletion/backup gagal, availability mayor | ≤2 jam | ≤12 jam |
| Sev-3 | risiko rendah tanpa paparan data, anomaly terkontrol | ≤1 hari kerja | sesuai sprint/security SLA |

### 14.2 Runbook wajib

1. **Detect/declare:** buka incident ID, tunjuk Incident Commander, Security Lead, Privacy/Legal Lead, dan Communications Lead; catat timeline UTC.
2. **Preserve:** snapshot log/audit dan bukti dengan access control; jangan menyalin raw PII ke chat/ticket umum.
3. **Contain:** revoke session/key, disable affected function/OTA/channel, turunkan rate limit, hentikan processor, atau pasang deny policy teruji. Jangan menghapus bukti.
4. **Assess:** tentukan data/subjek/tenant/waktu/jumlah, exploitability, processor, negara, backup, dan apakah kegagalan pelindungan data terjadi.
5. **Notify:** Privacy/Legal Lead menjalankan penilaian UU PDP Pasal 46 segera agar pemberitahuan 3 x 24 jam dapat dipenuhi bila berlaku; koordinasikan store/provider/penegak hukum sesuai kewajiban.
6. **Eradicate/recover:** patch, rotate, rebuild clean, restore bila perlu, staged rollout, dan monitor regression. Recovery tidak boleh menonaktifkan RLS atau menghidupkan akun yang telah dihapus.
7. **Learn:** post-incident review tanpa menyalahkan individu maksimal 5 hari kerja; action item memiliki owner/tanggal dan test regresi.

Kontak on-call, legal/privacy, Supabase/EAS/provider, template notifikasi, serta prosedur break-glass disimpan pada runbook operasional yang dapat diakses saat sistem utama down. Tabletop Sev-1 dilakukan dua kali setahun; drill revoke key/session dan rollback OTA setiap kuartal.

## 15. Verification plan dan release gates

### Gate G0 — design ready

- [ ] Data-flow diagram, asset inventory, threat model, tenant model, processor list, dan data-retention matrix disetujui.
- [ ] Legal review UU PDP, transfer/processor, age scope, terms, privacy notice, dan batas non-kustodian/non-advisory selesai.
- [ ] Semua MASVS group memiliki requirement/test/evidence owner.

### Gate G1 — setiap pull request

- [ ] Lint/typecheck/unit/integration test lulus.
- [ ] Secret scan, SAST, dependency/license scan lulus; lockfile tidak berubah tanpa review.
- [ ] Migration menyertakan RLS policy dan positive/negative tenant tests.
- [ ] Perubahan data/SDK/provider memperbarui inventory, consent, retention, dan store disclosure draft.

### Gate G2 — security-complete staging

- [ ] OAuth/PKCE/deep-link negative tests pada perangkat nyata lulus.
- [ ] RLS matrix lintas household untuk seluruh tabel/view/RPC/realtime/storage lulus.
- [ ] `user_preferences` owner-only select/RPC, user-scope sync cursor, cross-user deny, dan household-default separation lulus.
- [ ] Ledger all-account-line projection/RLS, signed account lines, positive category lines, lifecycle/clearing separation, one-header transfer, reversal, dan bigint overflow tests lulus.
- [ ] Malicious file corpus, on-device OCR/voice injection, no-network/no-server-capture, confirmation + keep-image gate, idempotency, rate-limit, dan abuse/load tests lulus.
- [ ] Log redaction/canary, token storage, TLS/MITM, backup restore, deletion E2E Day 7/Day 30, dan active processor deletion lulus.
- [ ] Signed EAS Update, wrong runtime, tamper rejection, staged rollout, dan rollback lulus.

### Gate G3 — store submission

- [ ] Independent penetration test berfokus auth, IDOR/RLS, deep link, file parser, API abuse, dan mobile storage selesai; tidak ada Critical/High terbuka.
- [ ] Apple App Privacy/Privacy Manifest/Sign in with Apple/in-app deletion dan Google Data safety/web deletion/financial declaration diverifikasi terhadap binary dan network capture.
- [ ] Demo account/mode tidak memakai data produksi; production backend, support, monitoring, dan incident contacts siap.

### Gate G4 — production/operational

- [ ] Backup/PITR memenuhi RPO ≤1 jam dan full restore membuktikan RTO ≤4 jam.
- [ ] Alert Sev-1, on-call, key rotation, session revoke, break-glass, processor outage, dan legal notification drill siap.
- [ ] SBOM, provenance, artifact hash, signing evidence, MASVS evidence, risk acceptance, dan approvals diarsipkan per release.
- [ ] Monitoring 24 jam pertama aktif; OTA/app rollout dapat dihentikan atau di-rollback.

### Definition of Done keamanan

Release hanya dapat dinyatakan selesai bila:

- tidak ada vulnerability Critical/High yang belum diperbaiki;
- Medium memiliki owner, deadline, compensating control, dan risk acceptance; Low masuk backlog;
- seluruh test negatif auth/RLS/file/deletion lulus pada build release, bukan hanya development client;
- privacy/store declarations cocok dengan perilaku yang diamati;
- bukti test dapat direproduksi dan terhubung ke commit/build/OTA ID yang dirilis.

## 16. Sumber normatif dan panduan implementasi

- [OWASP MASVS — control groups dan penggunaan standar](https://mas.owasp.org/MASVS/03-Using_the_MASVS/)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage — Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Auth — Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase Auth — Google Login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Auth — Apple Login](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple — Offering Account Deletion in Your App](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple — App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play — Account Deletion Requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play — Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [UU Republik Indonesia No. 27 Tahun 2022 tentang Pelindungan Data Pribadi — salinan resmi](https://jdih.kemenkoinfra.go.id/cfind/source/files/uu/uu-nomor-27-tahun-2022.pdf)

Versi/policy sumber di atas harus diperiksa ulang saat store submission dan minimal setiap kuartal karena standar, SDK, serta kebijakan store dapat berubah.
