# F17 — Multi-Currency

**Status:** Planned · **Phase:** 4 · **Priority:** P1

## Outcome dan JTBD

Pengguna yang menerima, menyimpan, atau membelanjakan uang dalam beberapa mata uang dapat melihat nilai asli setiap transaksi dan ringkasan yang konsisten dalam mata uang dasar. JTBD: “Saat bepergian atau memiliki account valuta asing, saya ingin catatan asli tidak berubah tetapi net worth dan laporan tetap bisa dibandingkan.”

## Scope

- Currency default household, currency per account, original transaction currency, dan display locale.
- Transfer lintas mata uang dengan source amount, destination amount, effective rate, dan fee terpisah.
- Rate manual dan rate referensi ter-versioning dengan source/timestamp.
- Budget/report/net worth dalam base currency serta drill-down original currency.
- Dukungan ISO 4217 exponent 0/2/3 dan crypto-like assets hanya bila ditambahkan sebagai tipe asset terpisah di masa depan.

**Non-scope:** jual-beli valuta, settlement, rate guarantee, trading, atau klaim rate real-time untuk transaksi finansial.

## UX flow

1. Onboarding memilih IDR sebagai base currency default.
2. Saat membuat account, pengguna memilih currency; currency tidak dapat diganti setelah ada transaksi tanpa migration flow.
3. Entry pada account asing otomatis memakai currency account. Pengguna boleh mencatat transaksi card dalam currency merchant dan nilai settlement account.
4. Transfer lintas currency meminta “keluar”, “masuk”, fee, dan menampilkan effective rate.
5. Report menampilkan label “Dikonversi ke IDR menggunakan rate [sumber/tanggal]”; tap membuka nilai asli.

## Functional requirements

- **F17-FR-001:** Sistem memuat metadata currency code, exponent, symbol, dan localized name; currency tak dikenal ditolak.
- **F17-FR-002:** Nilai asli, currency, rate, rate source, serta converted amount tidak boleh ditimpa saat rate referensi kemudian berubah.
- **F17-FR-003:** User dapat memilih manual rate; UI menandainya `manual` dan menyimpan siapa/kapan.
- **F17-FR-004:** Cross-currency transfer membuat satu operasi atomik dengan dua ledger legs dan optional fee expense.
- **F17-FR-005:** Dashboard/report memilih rate “as-of” sesuai kebijakan report; missing rate menampilkan partial total dan daftar gap, bukan menganggap 1:1.
- **F17-FR-006:** Mengubah base currency membuat versioned preference dan memicu recompute read model; original ledger tidak berubah.
- **F17-FR-007:** Import/export mempertahankan original and settlement amount beserta provenance.

## Business rules dan data

Persisted money memakai `amount_minor bigint` + `currency_code`, atau decimal string pada boundary. `currencies(code, exponent, active)`, `exchange_rates(base_code, quote_code, rate numeric(24,10), effective_at, source, provider_reference, created_at)`, dan `households.base_currency_code` menjadi kontrak utama. `entry_splits` tetap memakai kontrak kanonis `amount_minor`, `currency_code`, optional `reporting_amount_minor`, `reporting_currency_code`, dan `exchange_rate_id`; rate manual juga dibuat sebagai row `exchange_rates(source='manual')`. Tidak ada field original/settlement/manual-rate paralel yang dapat menjadi sumber nominal kedua.

Rounding memakai half-even pada conversion read model; selisih alokasi split ditaruh pada split terakhir dan dicatat sebagai `rounding_delta_minor`. Rate nol/negatif, timestamp masa depan di luar tolerance, atau precision berlebih ditolak. Base currency report memakai timezone dan end-of-period rate policy yang eksplisit; cash-flow transaction memakai transaction-time rate.

## Interfaces dan implementasi

```ts
type Money = { minor: bigint; currency: string };
type FxQuote = { base: string; quote: string; rate: string; effectiveAt: string; source: 'manual' | 'provider' | 'import'; providerReference?: string };
interface FxRateRepository { getAsOf(base: string, quote: string, at: string): Promise<FxQuote | null>; }
```

Domain `convertMoney`, `allocateRounding`, dan `createCrossCurrencyTransfer` harus pure dan property-tested. Provider rate berada di adapter/Edge Function; client tidak mempercayai response tanpa schema validation. Cache rate lokal bertanda expiry tetapi historical rate immutable.

## Offline, privacy, security, dan errors

Entry offline boleh memakai last-known rate dengan label jelas atau manual rate. Outbox membawa rate provenance; server memvalidasi ulang format, bukan diam-diam mengganti pilihan user. Data currency tergolong data finansial privat dan tunduk RLS household. Analytics hanya mengirim currency-count bucket dan outcome, tidak code+amount yang dapat memfingerprint portofolio.

Error utama: missing rate, stale rate, unsupported currency, mismatch account currency, dan concurrent base-currency change. Semua menyediakan retry/manual fallback tanpa membuang draft.

## Analytics

Event privacy-safe: `currency_account_created`, `fx_rate_source_selected`, `cross_currency_transfer_confirmed`, dan `report_rate_gap_viewed`. Property hanya source type, currency-count bucket, stale/missing flag, outcome, serta latency bucket; kombinasi currency spesifik dan nominal tidak dikirim.

## Acceptance criteria

- **Given** account JPY dan base IDR, **when** expense ¥1.000 disimpan, **then** nilai asli tetap ¥1.000 dan report IDR menunjukkan provenance rate.
- **Given** transfer USD→IDR dengan fee, **when** disimpan, **then** kedua balance berubah atomik, fee masuk expense, dan transfer tidak dihitung income.
- **Given** tidak ada rate tanggal report, **when** net worth dibuka, **then** UI menandai incomplete total dan tidak memakai rate 1:1.
- **Given** retry request sama, **when** sync ulang, **then** tidak ada cross-currency legs ganda.

## Test matrix

Exponent 0/2/3; nilai besar; rate inverse; weekend/missing rate; timezone boundary; half-even tie; manual vs reference; import/export round-trip; offline stale rate; concurrent base change; RLS household; property test conversion/rounding.

## Delivery slices dan rollout

1. Metadata/money domain + tests.
2. Account/original currency UI.
3. Cross-currency transfer and RPC.
4. Rate repository/manual rate/read models.
5. Report/import/export integration.

Rollout di balik `multi_currency_enabled`; mulai household internal dengan dua currency. Kill switch menyembunyikan pembuatan entry baru tetapi tetap membolehkan melihat/export data historis.
