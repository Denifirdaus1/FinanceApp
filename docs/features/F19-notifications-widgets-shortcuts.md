# F19 — Notifications, Widgets, dan Shortcuts

**Status:** Planned · **Phase:** Phase 2 notifications, Phase 4 widgets/shortcuts · **Priority:** P1

## Outcome dan JTBD

Pengguna mendapat pengingat yang berguna tanpa membuka data finansial sensitif di lock screen, serta dapat mencatat transaksi lebih cepat dari home screen. JTBD: “Ingatkan saya sebelum tagihan/budget bermasalah, tetapi jangan bocorkan kondisi keuangan saya.”

## Scope

- Local/push notification untuk recurring bill, due debt, budget threshold, goal milestone, sync issue, security/account event, dan weekly summary readiness.
- Quiet hours, timezone, per-channel preferences, snooze, dedupe, deep link, delivery history.
- Home-screen widget privacy-aware dan OS shortcut untuk add expense/income/voice/receipt.

**Non-scope:** promotional push default-on, nominal sensitif di lock screen tanpa opt-in, atau critical alert entitlement.

## UX flow

1. Permission notification diminta just-in-time setelah user mengaktifkan reminder, bukan saat first launch.
2. Pre-permission screen menjelaskan value; denial tetap memungkinkan in-app reminder/calendar.
3. Default push body generik: “Ada pengingat keuangan untuk Anda.” Detail muncul setelah unlock/app auth.
4. Tap memvalidasi session, membership, dan route target; stale target membuka safe fallback.
5. Settings memungkinkan channel, threshold, quiet hours, preview privacy, dan widget privacy.

## Functional requirements

- **F19-FR-001:** Preference tersimpan per user+household+notification type; security notices tidak dapat dimatikan bila diwajibkan untuk account safety.
- **F19-FR-002:** Scheduler idempotent menggunakan occurrence/reminder key dan tidak mengirim duplicate lintas device.
- **F19-FR-003:** Semua schedule memakai household timezone dan menangani DST/timezone change.
- **F19-FR-004:** Deep link hanya membawa opaque ID; app melakukan authorization dan fetch ulang sebelum render.
- **F19-FR-005:** Quiet hours menunda non-security message; due-critical tetap mengikuti explicit user choice.
- **F19-FR-006:** Budget alert memiliki hysteresis/dedupe agar tidak berulang saat transaksi bolak-balik melewati threshold.
- **F19-FR-007:** Widget default menyembunyikan nominal dan account name; reveal membutuhkan opt-in, device unlock policy, dan privacy-mode off.
- **F19-FR-008:** Shortcut membuka capture flow sesuai action dan selalu berakhir di confirmation.
- **F19-FR-009:** Token push invalid dihapus; logout/revoke membatalkan schedule dan token association.

## Data dan interfaces

Tables: `notification_preferences`, `device_installations` (pemilik push token), `notification_jobs`, `notification_deliveries`, dan `notification_snoozes`. Minimal fields: household/user, type, enabled, channel, threshold, quiet start/end, timezone, dedupe_key, occurrence_at, state, attempt_count, provider_message_id, delivered/opened timestamps. Payload sensitif tidak disimpan di delivery log.

```ts
interface ReminderScheduler { reconcile(scopeId: string): Promise<void>; }
interface NotificationPresenter { requestPermission(): Promise<PermissionState>; scheduleLocal(input: SafeNotification): Promise<string>; }
```

Local reminders dipilih untuk device-specific quick reliability; server jobs dipakai untuk multi-device/derived events. Reconciliation memastikan hanya satu user-visible reminder per occurrence.

## Offline, security, dan analytics

Offline schedule dari cached recurring rules; perubahan disinkron saat online. Notification content dan widget menggunakan `privacy_level: generic|amount` yang tervalidasi. Push token dienkripsi at rest dan RLS owner-only; provider secret server-only. Analytics: `notification_permission_outcome`, `notification_scheduled`, `notification_opened`, `shortcut_started/completed`, dengan type dan latency bucket saja—tanpa amount/title/note.

## Acceptance criteria

- **Given** privacy default, **when** bill reminder muncul di lock screen, **then** tidak ada nominal, merchant, account, atau household name.
- **Given** quiet hours 22:00–07:00, **when** budget alert dibuat 23:00, **then** delivery ditunda ke 07:00 kecuali security event.
- **Given** dua device, **when** recurring occurrence sama diproses, **then** dedupe policy menghasilkan satu notification per target policy.
- **Given** deep link milik household yang aksesnya dicabut, **when** ditap, **then** authorization gagal aman dan data tidak dirender.

## Test matrix

Permission granted/denied/blocked; timezone/DST; offline; duplicate job; stale token; logout/revoke; reinstall; quiet hours; threshold hysteresis; lock-screen privacy; deep-link tamper; widget refresh/stale data; font scale/screen reader.

## Delivery dan rollout

1. Preferences + local recurring reminder.
2. Server schedule/delivery/dedupe.
3. Deep links + security events.
4. Shortcuts.
5. Widgets after privacy review.

Feature flags per notification type dan widget. Kill switch menghentikan scheduling/push baru dan membersihkan pending non-security notifications tanpa mengubah user finance data.
