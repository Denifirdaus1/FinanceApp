# Sumber Riset dan Label Pengetahuan

Tanggal verifikasi: 24 Agustus 2026. Sumber primer diprioritaskan untuk keputusan teknis, keamanan, dan kebijakan distribusi. Halaman vendor/kompetitor dipakai hanya sebagai benchmark pola produk, bukan sebagai requirement otomatis.

## Dokumentasi teknis resmi

- **CTX7-EXPO-OTA** — Context7 `/expo/expo/__branch__sdk-56`, [EAS Update](https://docs.expo.dev/eas-update/introduction/) dan [runtime versions](https://docs.expo.dev/eas-update/runtime-versions/). Dasar keputusan bahwa OTA mengganti JS/style/assets yang kompatibel, sementara native code/config memerlukan build baru.
- **EXA-EXPO-SQLCIPHER** — [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/). Mendukung SQLCipher pada Android/iOS melalui config plugin dan prebuild; tidak tersedia di Expo Go.
- **CTX7-SUPABASE-AUTH** — Context7 `/supabase/supabase`, [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) dan contoh Expo social auth. Dasar OAuth redirect allowlist, browser auth session, PKCE, dan persisted session.
- **CTX7-SUPABASE-RLS** — Context7 `/supabase/supabase`, [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). Dasar private bucket, folder/user isolation, signed URL, dan larangan service-role key di client.
- **EXA-MLKIT-OCR** — [Google ML Kit Text Recognition v2](https://developers.google.com/ml-kit/vision/text-recognition/v2). Mendukung struktur blocks/lines/elements, script Latin, dan kasus receipt data entry.
- **EXA-APPLE-SPEECH** — [Apple Speech framework](https://developer.apple.com/documentation/speech). Dasar transkripsi live/prerecorded serta confidence/alternatives pada iOS.
- **EXA-OWASP-MASVS** — [OWASP MASVS](https://mas.owasp.org/MASVS/). Baseline verifikasi storage, crypto, auth, network, platform, code, resilience, dan privacy.

## Kebijakan distribusi dan privacy

- **EXA-APPLE-LOGIN** — [Apple App Review Guidelines §4.8](https://developer.apple.com/app-store/review/guidelines/#login-services). Social login untuk primary account perlu opsi login ekuivalen yang memenuhi ketentuan; implementasi v1 menyediakan Apple di iOS selain Google.
- **EXA-PLAY-DELETION** — [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111). Aplikasi yang membuat akun menyediakan jalur hapus akun di aplikasi dan resource web.
- **EXA-ID-PDP** — [UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang+nomor+27+tahun+2022). Digunakan sebagai baseline legal review untuk transparansi tujuan, akses/koreksi/ekspor/penghapusan, keamanan, dan akuntabilitas. Dokumen produk bukan opini hukum.

## Benchmark produk

- **EXA-MONARCH** — [Monarch](https://www.monarch.com/) dan help center: accounts, transaction review, flexible/category budget, recurring, reports, goals, net worth, dan household collaboration.
- **EXA-YNAB** — [YNAB](https://www.ynab.com/features): intentional budgeting, goals, account/transaction workflows, serta edukasi kebiasaan finansial.
- **EXA-SPENDEE** — [Spendee](https://www.spendee.com/): cash/bank/e-wallet tracking, shared wallets, multi-currency, reminders, sync, dan visual reporting.

## Catatan penggunaan

- Versi dependency harus diverifikasi lagi ketika scaffolding dimulai dan dikunci dalam lockfile.
- Library community untuk OCR/speech harus melalui spike kompatibilitas, maintenance review, license review, dan device test sebelum dipilih; spesifikasi menggunakan adapter agar provider dapat diganti.
- Ketentuan store dan hukum dapat berubah. Lakukan legal/policy review kembali sebelum beta eksternal dan setiap penambahan negara atau pemroses data.

