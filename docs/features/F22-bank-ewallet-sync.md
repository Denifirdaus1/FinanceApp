# F22 — Bank dan E-Wallet Sync

**Status:** Future, provider-gated · **Phase:** 5 · **Priority:** P2

## Outcome dan JTBD

Pengguna dapat mengimpor saldo/transaksi secara read-only dari institusi yang didukung, lalu meninjau dan merekonsiliasinya tanpa memberikan credential bank kepada FinanceApp. JTBD: “Kurangi input manual, tetapi beri saya kontrol atas koneksi dan duplicate.”

## Scope

- Provider-neutral read-only connection flow, consent, account discovery, historical sync, incremental cursor/webhook, normalization, category suggestion, dedupe, reconciliation, disconnect, dan deletion.
- Coverage bank/e-wallet Indonesia hanya setelah vendor nyata dipilih, diprovisioning, dan lolos legal/security/reliability/cost review.
- CSV import F20 tetap fallback resmi untuk institusi tanpa koneksi.

**Non-scope:** credential scraping, menyimpan username/password/PIN/OTP, payment initiation, transfer, card controls, lending, screen scraping yang melanggar terms, atau klaim seluruh bank Indonesia didukung.

## UX flow

1. `Hubungkan institusi` menjelaskan data, read-only scope, provider, refresh cadence, retention, dan disconnect.
2. OAuth/hosted consent provider dibuka; callback menggunakan state+PKCE dan exact redirect allowlist.
3. User memilih account yang akan diimpor dan mapping ke account baru/existing.
4. Initial sync menampilkan progress dan reconciliation preview; possible duplicates perlu review.
5. Connection health menunjukkan `Aktif`, `Perlu login ulang`, `Tertunda`, atau `Terputus` tanpa menyalahkan user.
6. Disconnect menghentikan access/token, memberi pilihan mempertahankan atau menghapus imported records sesuai audit policy.

## Functional requirements

- **F22-FR-001:** Provider adapter hanya menerima short-lived connection reference; raw banking credential tidak melewati FinanceApp.
- **F22-FR-002:** Consent merekam scopes, institutions/accounts, provider, purpose, granted/expires/revoked timestamps, dan policy version.
- **F22-FR-003:** Secrets/tokens provider dienkripsi server-side; client hanya menerima opaque connection ID.
- **F22-FR-004:** Sync cursor dan webhook idempotent; event signature, timestamp, replay window, dan connection ownership divalidasi.
- **F22-FR-005:** Normalized transaction mempertahankan provider ID, raw hash, posted/authorized date, amount/currency, status, merchant, dan raw-reference provenance; raw payload retention diminimalkan.
- **F22-FR-006:** Pending→posted merge tidak membuat duplicate; reversal/refund memiliki hubungan eksplisit.
- **F22-FR-007:** Dedupe terhadap transaksi manual/receipt menggunakan ranked candidates; auto-merge hanya di atas threshold tervalidasi dan tetap reversible.
- **F22-FR-008:** Disconnect/revoke segera menghentikan future sync dan menjadwalkan token deletion; UI menjelaskan nasib data historis.
- **F22-FR-009:** Provider outage/backfill tidak mengubah balance menjadi nol dan tidak menghapus ledger diam-diam.
- **F22-FR-010:** Setiap institusi memiliki capability/health flag; rollout dapat dimatikan per provider/institution/version.

## Data dan interfaces

Tables: `financial_connections`, `external_accounts`, `provider_sync_cursors`, `provider_events`, `external_transactions_staging`, `reconciliation_links`, dan `connection_consents` yang mereferensikan acknowledgement di `user_consents`. RLS exposes sanitized connection/account states ke authorized household; tokens berada di vault/server-only storage terpisah dan tidak pernah selectable oleh client role. Staging eksternal bukan ledger dan hanya menjadi `financial_entries` setelah reconciliation RPC.

```ts
interface FinancialDataProvider {
  createConsentSession(input: ConsentRequest): Promise<HostedSession>;
  exchangeCallback(input: OAuthCallback): Promise<ConnectionSecretRef>;
  sync(connection: ConnectionSecretRef, cursor?: string): AsyncIterable<ProviderPage>;
  revoke(connection: ConnectionSecretRef): Promise<void>;
}
```

Edge Functions/jobs melakukan exchange/sync/webhook. Normalizer output divalidasi Zod lalu masuk staging; RPC reconciliation atomik menghubungkan ke ledger.

## Offline, security, dan privacy

Imported data terakhir dapat dibaca offline; koneksi/sync memerlukan online. RLS, least-privilege scope, step-up auth untuk connect/disconnect, encrypted tokens, signed webhook, audit, rate limit, dan incident revocation wajib. Vendor contract harus menutup data purpose, subprocessor, residency/transfer, retention, breach notice, deletion, SLA, serta exit/export. Tidak ada provider SDK dipasang sebelum keputusan dan provisioning disetujui.

## Analytics

Event: `connection_consent_started`, `connection_established`, `connection_sync_completed`, `connection_reauth_required`, `reconciliation_completed`, dan `connection_disconnected`. Property hanya provider/institution capability bucket yang telah disetujui privacy review, page/count/latency bucket, health/outcome, serta stable error code; token, institution account ID, balance, amount, merchant, dan raw provider payload dilarang.

## Acceptance criteria

- **Given** consent callback state tidak cocok, **when** diterima, **then** koneksi ditolak tanpa token exchange.
- **Given** webhook sama dikirim ulang, **when** diproses, **then** tidak ada duplicate transaction.
- **Given** pending transaction menjadi posted, **when** sync berikutnya, **then** satu ledger item diperbarui dengan provenance, bukan dibuat baru.
- **Given** provider outage, **when** dashboard dibuka, **then** last-known balance bertanda stale dan tidak menjadi nol.
- **Given** disconnect, **when** selesai, **then** token revoked/deleted dan future webhook/sync ditolak.

## Test matrix

OAuth cancel/state/PKCE; webhook signature/replay; cursor repeat/gap; pagination; pending→posted; reversal/refund; duplicate manual/receipt; multi-currency; provider 429/5xx; consent expiry; re-auth; account removed; disconnect/delete; cross-tenant; fake vendor sandbox vs production contract tests; cost/reliability load.

## Delivery dan rollout

1. User research + institution demand ranking.
2. Vendor discovery/procurement/security/legal/cost and real sandbox provisioning.
3. Provider interface + synthetic recorded contract suite.
4. One read-only institution cohort; reconciliation UX.
5. Per-institution gradual rollout with SLA dashboard.

Kill switch per provider/institution stops sync/webhook processing safely while retaining last-known data and CSV/manual paths. Fitur tidak menjadi launch blocker.
