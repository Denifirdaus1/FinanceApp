# F24 — Security, Privacy, dan Account Controls

**Status:** Required foundation · **Phase:** Phase 0 foundation, Phase 1 controls, Phase 4 hardening · **Priority:** P0

## Outcome dan JTBD

Pengguna memahami bagaimana data finansial diproses, dapat melindungi tampilan di perangkat, mengelola sesi/consent, mengekspor atau menghapus data, dan mendapat respons aman saat risiko terjadi. JTBD: “Data keuangan saya sangat pribadi; beri saya kontrol nyata dan jangan membuat klaim keamanan yang menyesatkan.”

## Scope

- App lock biometric/device credential, privacy mode, session/device list, revoke sessions, consent center, data/attachment retention controls, export/delete account, security notifications, audit-visible actions, dan support privacy request.
- Background snapshot blur, clipboard minimization, log redaction, safe sharing, rooted/jailbroken risk signal yang tidak menjadi satu-satunya kontrol.
- Security/privacy center menaut ke policy version dan contact/request channel.

**Non-scope:** klaim end-to-end encryption bila server dapat memproses data, custom cryptography, guaranteed screenshot prevention di semua OS, password vault, identity verification/KYC, atau menjadikan biometrics pengganti server authentication.

## UX flow

1. Privacy/security center menunjukkan status app lock, privacy mode, sessions, connected providers, AI consent, receipts retention, export, dan delete.
2. App lock optional ditawarkan setelah first financial record; unlock memakai biometric dengan device credential fallback sesuai OS policy.
3. Privacy mode menyamarkan amount/balance/widget/app-switcher; tap/re-auth sementara untuk reveal.
4. Session/device list memungkinkan revoke; current device revoke menjalankan secure logout/cache-key purge.
5. Export memakai step-up auth. Delete account menjelaskan 7-day grace, data shared, provider revocation, backup window, lalu double confirmation.

## Functional requirements

- **F24-FR-001:** App lock timeout dapat dipilih immediate/1/5/15 menit; state background dan device reboot mengunci sesuai policy.
- **F24-FR-002:** Biometric result hanya membuka local encryption/session gate; server JWT tetap diverifikasi dan dapat dicabut.
- **F24-FR-003:** Privacy mode berlaku konsisten pada dashboard, lists, notifications, widgets, search preview, recent-app snapshot, dan screen-reader label sensitif.
- **F24-FR-004:** Screenshot blocking diterapkan hanya di platform/screen yang mendukung dan dijelaskan sebagai risk reduction, bukan jaminan.
- **F24-FR-005:** Session management menampilkan created/last-active coarse time, platform, dan approximate device label tanpa precise tracking fingerprint.
- **F24-FR-006:** Consent ledger mencatat purpose, legal basis/reason, policy version, granted/revoked time, dan processor class; optional processing berhenti setelah revoke.
- **F24-FR-007:** Data export dan correction/deletion requests dapat diajukan dalam app; deletion request juga punya web resource sebelum Play launch.
- **F24-FR-008:** Delete flow mencabut provider tokens, menonaktifkan sessions, mengunci data, memulai grace period 7 hari, lalu purge active stores; backup expires maksimal 30 hari sesuai notice.
- **F24-FR-009:** Security events penting menghasilkan generic notice dan immutable server audit; audit tidak menyimpan token/financial payload.
- **F24-FR-010:** Logs/crash/analytics memakai allowlist fields dan centralized redaction; debug build tidak pernah mengaktifkan production secrets/data dumps.
- **F24-FR-011:** Receipt/audio/temp files memiliki TTL dan cleanup saat cancel/logout/delete; raw audio tidak disimpan default.
- **F24-FR-012:** Compromised-device signal dapat menambah warning/step-up atau menonaktifkan export secret, tetapi core access tidak diblokir hanya berdasarkan heuristic tanpa policy review.

## Data dan services

Tables: `user_security_preferences`, `device_installations`, `user_consents`, `data_export_jobs`, `account_deletion_requests`, dan `audit_events`. Client secure storage: auth session adapter, SQLCipher key, lock policy marker; tidak ada service-role/provider secret. Session list adalah authorized projection dari Auth session metadata + `device_installations`, bukan token/session table yang dapat dibaca client.

Services: `LocalAppLock`, `PrivacyMask`, `SessionManager`, `ConsentService`, `PrivacyRequestService`, `SecureCleanup`. Edge Functions untuk revoke-all, export request, delete/cancel deletion, and purge job selalu JWT/step-up protected serta idempotent.

## Security controls

- PKCE OAuth, exact deep-link allowlist, state/nonce, secure refresh lifecycle.
- RLS deny-by-default dan negative tenant tests; private Storage object paths.
- TLS, secret manager, short-lived signed URLs, upload validation, rate limits, audit/correlation ID.
- SQLCipher key di platform secure store; delete key membuat local database inaccessible sebelum file cleanup.
- Dependency/SAST/secret/license scan, signed EAS builds/updates, runtimeVersion, staged rollout/rollback.
- Incident playbook: detect → contain/kill switch/revoke → assess → notify per legal duty → recover → postmortem.

## Offline dan errors

App lock/privacy mode bekerja offline. Revoke remote diterapkan saat next server contact; high-risk screens dapat mensyaratkan recent online auth. SecureStore unavailable, biometric changed, key mismatch, export failure, deletion partial, dan provider revoke failure memiliki recovery yang tidak membuka plaintext. Key loss berarti local cache dihapus lalu di-sync ulang setelah auth; tidak mencoba custom key recovery yang melemahkan security.

## Analytics

Events: `app_lock_enabled/disabled/unlock_outcome`, `privacy_mode_changed`, `session_revoked`, `consent_changed`, `export_requested/completed`, `account_deletion_requested/cancelled/completed`, `security_notice_opened`. Properties hanya mode/outcome/error category/latency bucket; tidak ada biometric data, token, IP precise, email, amount, receipt, note, atau transcript.

## Acceptance criteria

- **Given** privacy mode aktif, **when** app masuk recent-apps atau widget refresh, **then** nominal/account name tidak terlihat.
- **Given** biometric enrollment berubah dan key invalid, **when** app dibuka, **then** local plaintext tidak terbuka; user re-auth lalu safe re-sync.
- **Given** user mencabut AI consent, **when** pertanyaan baru dibuat, **then** processing ditolak dan retention deletion dimulai.
- **Given** delete account dikonfirmasi, **when** grace period selesai, **then** active data/provider tokens terhapus, sessions invalid, dan audit hanya menyimpan minimum legal proof.
- **Given** User A memodifikasi client, **when** meminta export User B, **then** server authorization menolak dan mencatat safe security event.

## Test matrix

Biometric success/fail/lockout/enrollment change; background/reboot/timeout; privacy across every surface; screenshot best-effort; session revoke current/other/offline; consent version/revoke; export/deletion/cancel/purge; provider revoke failure; SecureStore/key loss; log leakage scan; deep-link attack; RLS/object access; MASVS manual/static/dynamic checks.

## Delivery dan rollout

1. Central redaction, secure storage, RLS, privacy mode.
2. App lock and background protection.
3. Session/consent center.
4. Export/delete/provider revoke pipeline.
5. MASVS verification, incident drills, policy/store artifacts.

Security controls bukan optional feature flag. Kill switch hanya untuk risky processors/integrations; export, consent revoke, delete request, dan secure logout harus selalu memiliki jalur yang berfungsi.
