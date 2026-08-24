# F23 — Household Sharing dan Permissions

**Status:** Planned · **Phase:** 4 · **Priority:** P1

## Outcome dan JTBD

Pasangan/keluarga dapat mengelola sebagian keuangan bersama dengan login masing-masing dan batas visibilitas yang jelas. JTBD: “Kami ingin melihat dan merencanakan uang bersama tanpa harus berbagi password atau membuka semua account pribadi.”

## Scope

- Invite link/email, accept/decline/expire/revoke, role household, ownership, dan permission per account.
- Shared account, transaction, category, budget, goal, recurring, report; private account tetap tidak terlihat.
- Attribution `created_by/updated_by`, activity history, conflict handling, member offboarding, serta household export.

**Non-scope:** child account/custodial controls, legal ownership dana, multiple simultaneous households per user pada v1, chat, approval workflow pembayaran, atau professional financial advisor access.

## Roles dan permissions

| Role | Member | Account share | Budget/settings | Invite/revoke | Delete household |
|---|---|---|---|---|---|
| Owner | Read/write yang diizinkan | Create/share/unshare miliknya | Manage | Manage | Ya, step-up auth |
| Admin | Read/write yang diizinkan | Create/share sesuai policy | Manage | Invite/revoke non-owner | Tidak |
| Editor | Read/write account shared | Tidak mengubah ownership | Edit operational | Tidak | Tidak |
| Viewer | Read-only account shared | Tidak | Read-only | Tidak | Tidak |

Account pribadi tidak masuk agregat anggota lain. Owner account dapat memilih private/shared serta minimum role; perubahan share memakai impact preview dan step-up auth bila membuka histori.

## UX flow

1. Owner membuat household dan invitation ber-expiry dengan target email/opaque link.
2. Invitee login dengan identitas sendiri, melihat inviter/name dan permission summary, lalu accept.
3. Owner memilih account yang dibagikan; default tidak ada account yang otomatis shared.
4. Dashboard/report anggota hanya menghitung authorized accounts dan menandai scope “Keuangan bersama”.
5. Revoke menampilkan konsekuensi, mencabut server access langsung, membersihkan cache pada next contact, dan mencatat audit.

## Functional requirements

- **F23-FR-001:** Satu user tidak boleh membagikan credential/session; setiap anggota memakai `auth.users.id` sendiri.
- **F23-FR-002:** Invite token single-use, high entropy, hashed at rest, scoped household/role, expiry ≤7 hari, dan revocable.
- **F23-FR-003:** RLS memeriksa active membership dan account permission pada setiap row/object; UI hiding bukan authorization.
- **F23-FR-004:** Private account, transaction, attachment, category-derived clue, notification, search index, dan aggregate tidak bocor ke anggota lain.
- **F23-FR-005:** Role/permission escalation memerlukan actor berwenang, optimistic concurrency, dan immutable audit event.
- **F23-FR-006:** Owner transfer hanya ke active admin dengan step-up auth dan cooling confirmation; selalu ada tepat satu owner.
- **F23-FR-007:** Last owner tidak dapat leave sebelum transfer ownership atau delete household.
- **F23-FR-008:** Revoke berlaku server-side segera; device offline tidak boleh mengunggah mutation setelah reconnect.
- **F23-FR-009:** Shared edits memakai F18 version conflict; finance-critical overwrite tidak diam-diam.
- **F23-FR-010:** Export/deletion menghormati ownership: user dapat menghapus profile/contribution miliknya tanpa menghapus shared ledger yang masih wajib dimiliki household; privacy notice menjelaskan hasil.

## Data dan RPC

Tables: `households`, `household_members`, `household_invitations`, `account_permissions`, dan `audit_events` dengan `household_id`. Fields mencakup role/status, invited_by, joined/revoked/expiry, resource_id, capability, version. Financial entry dan dependent entities membawa `household_id`, account reference melalui lines, serta creator/updater; bukan hanya `user_id`.

RPC atomik: `create_household`, `invite_member`, `accept_invite`, `set_account_permission`, `transfer_ownership`, `revoke_member`, `leave_household`. Helper RLS menggunakan stable authorized-membership function dengan fixed `search_path`; pgTAP menguji setiap role/operation dan negative cases.

## Offline, security, dan analytics

Membership/permission cache memiliki short validity; sensitive shared view memerlukan recent authorization saat online. Setelah revoke signal/403, encryption scope/key reference dan local rows household dipurge. Invite tidak mengungkap apakah email sudah punya akun. Analytics hanya role/outcome/count buckets; tidak mengirim email, household name, account name, atau nominal.

## Acceptance criteria

- **Given** account A private dan B shared, **when** viewer membuka dashboard/search/export, **then** hanya B dan derived aggregates B terlihat.
- **Given** editor mencoba invite member atau membuka receipt private, **when** request dikirim langsung ke API, **then** RLS/RPC menolak.
- **Given** member dicabut saat offline, **when** kembali online dengan pending edit, **then** mutation ditolak dan cache shared dihapus.
- **Given** invite digunakan dua kali, **when** kedua attempt, **then** ditolak tanpa membership ganda.

## Test matrix

Semua role×CRUD; private-to-shared impact; shared-to-private; invite expiry/replay/enumeration; owner transfer/race; last-owner leave; revoke offline; deep link; receipt object; search/report side-channel; export/delete; concurrent edits; notification privacy; RLS query plans.

## Delivery dan rollout

1. Household/membership/RLS foundation.
2. Secure invites.
3. Per-account permission and scoped read models.
4. Audit/ownership/revoke/cache purge.
5. Export/deletion and usability/security review.

Rollout invite-only di balik `household_sharing_enabled`. Kill switch menghentikan invite/permission changes; existing access tetap mengikuti RLS hingga owner memilih, kecuali incident switch yang force-revokes connections.
