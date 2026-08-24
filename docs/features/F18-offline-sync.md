# F18 — Offline-First Synchronization

**Status:** Required foundation · **Phase:** Phase 0 foundation, Phase 1 core, Phase 4 hardening · **Priority:** P0

## Outcome dan JTBD

Pengguna dapat mencatat keuangan secara instan walau jaringan buruk, menutup aplikasi, lalu tersinkron tanpa kehilangan atau menduplikasi data. JTBD: “Saat saya baru membayar, saya ingin mencatat sekarang dan yakin data aman walau sedang offline.”

## Scope

- Encrypted local read store, transactional mutation outbox, retry, idempotency, delta pull, sync status, conflict review, dan schema migration.
- Background/foreground sync sesuai batas OS; manual retry; multi-device convergence.
- Purge aman saat logout, account switch, membership revoke, dan account deletion.

**Non-scope:** collaborative live editing ala dokumen, arbitrary CRDT, atau menjanjikan background sync real-time ketika OS menghentikan aplikasi.

## UX flow

1. Save meng-commit entity draft/final dan outbox atomik lalu langsung menampilkan hasil.
2. Status kecil: `Tersimpan di perangkat`, `Menyinkronkan`, `Tersinkron`, atau `Perlu diperiksa`.
3. Saat online, coordinator push mutation berurutan per aggregate, kemudian pull perubahan sejak cursor.
4. Conflict field sama masuk review sheet berisi versi “di perangkat” dan “di server”; pengguna memilih/merge.
5. Offline terlalu lama atau akses dicabut mengunci data terkait dan meminta re-auth sebelum purge.

## Functional requirements

- **F18-FR-001:** Local database memakai SQLCipher; key random per install disimpan di Keychain/Keystore melalui SecureStore.
- **F18-FR-002:** Entity change dan outbox record berada dalam satu local transaction.
- **F18-FR-003:** Setiap mutation memiliki UUID `mutation_id`, `entity_id`, `scope_type` (`user | household`), `scope_id`, nullable `household_id`, operation, base version, sanitized payload, created_at, attempts, dan state; mutasi preferensi user tidak dipaksa memiliki household.
- **F18-FR-004:** Server RPC mengembalikan hasil yang sama untuk idempotency key sama dan menolak reuse dengan payload berbeda.
- **F18-FR-005:** Retry memakai exponential backoff+jitter; 4xx non-retryable masuk review, 401 memicu refresh/re-auth, 429 menghormati retry-after.
- **F18-FR-006:** Pull memakai monotonic server cursor, tombstone, dan pagination; device clock bukan ordering authority.
- **F18-FR-007:** Auto-merge hanya jika field yang berubah tidak overlap; finance-critical same-field conflict tidak memakai blind last-write-wins.
- **F18-FR-008:** Sync schema incompatible memblokir mutation push dan menawarkan app update/manual export, tidak merusak local DB.
- **F18-FR-009:** Membership revocation memblokir push/pull household dan menghapus decrypted cache/key scope setelah policy check.
- **F18-FR-010:** User dapat melihat queue count, last success, dan actionable error tanpa payload sensitif.

## Data dan algorithm

Local tables: `local_entities`, normalized feature tables, `local_outbox`, `local_sync_state`, `local_user_sync_state`, `local_conflicts`, `local_schema_migrations`, dan `local_sync_leases`. `local_outbox` menyimpan `scope_type=user|household`, `scope_id`, serta `household_id` nullable; user-scope dan household-scope memakai cursor terpisah. Server entities memiliki `version bigint`, `updated_at` server-side, `deleted_at` tombstone, dan `last_mutation_id`/dedupe registry dengan retention melebihi maximum retry window.

Urutan cycle: acquire single-process lease → validate session/membership → push ordered outbox batches → persist acknowledgements atomik → pull pages after cursor → apply server changes and detect conflict → update cursor → release lease. Worker crash di titik mana pun harus aman untuk diulang.

## Interfaces

```ts
interface SyncCoordinator { run(reason: 'launch'|'foreground'|'network'|'manual'): Promise<SyncReport>; }
interface MutationTransport { push(batch: MutationEnvelope[]): Promise<MutationResult[]>; }
interface ConflictResolver { resolve(local: Versioned, remote: Versioned): AutoMerge | NeedsReview; }
```

Feature repository tidak boleh memanggil Supabase langsung; seluruh mutation melewati local unit-of-work/outbox. Realtime hanya menjadi invalidation hint, bukan source of truth.

## Security dan privacy

Database key tidak pernah ditulis ke logs/analytics. Screen snapshot sensitive dapat diblur saat app background. Logout menghapus session, key, database, temp receipt/audio, dan pending notifications setelah server revoke attempt; bila offline, data segera inaccessible dengan key deletion. Diagnostic export berisi codes/timings, bukan financial payload.

## Analytics

Event: `sync_cycle_completed`, `outbox_item_state_changed`, `sync_conflict_detected`, `sync_conflict_resolved`, dan `access_purge_completed`. Property dibatasi pada trigger, entity-type, queue/age/latency bucket, retry count bucket, merge outcome, serta stable error code; payload, nominal, note, merchant, dan entity ID tidak dikirim.

## Acceptance criteria

- **Given** airplane mode, **when** transaksi disimpan lalu app force-close, **then** transaksi tetap ada setelah reopen dengan status local dan sync sekali saat online.
- **Given** server memproses mutation tetapi response hilang, **when** client retry, **then** hanya satu entity tercipta.
- **Given** dua device mengubah note dan category berbeda, **when** sync, **then** auto-merge; jika keduanya mengubah amount, review diwajibkan.
- **Given** household access dicabut saat device offline, **when** kembali online, **then** push ditolak, data terkunci/purge, dan tidak bocor ke account lain.

## Test matrix

Airplane/slow/flapping network; force-close di setiap transition; 401/403/409/429/5xx; duplicate/reordered responses; DB full/corrupt; key missing; schema upgrade/downgrade; time skew; two devices; tombstone; revoked member; 10k records; background limits; property test idempotency/convergence.

## Delivery slices dan rollout

1. SQLCipher/key lifecycle and migration harness.
2. Local repositories + atomic outbox.
3. Idempotent server RPC/dedupe.
4. Push/pull/cursor/retry.
5. Conflict and revocation UX.
6. Observability, load, and fault injection.

Kill switch dapat mematikan background/realtime trigger, tetapi manual local capture dan safe manual sync tetap ada. Rollout cohort mengawasi outbox age, duplicate count, conflict rate, dan data-loss sentinel.
