# Roadmap dan Release Plan

## 1. Asumsi kapasitas

Estimasi relatif menggunakan sprint dua minggu dengan tim inti: 2 mobile engineer, 1 backend/full-stack engineer, 1 product designer, 1 QA automation, serta product/security paruh waktu. Angka adalah alat sequencing, bukan janji tanggal. Discovery pengguna berjalan paralel tanpa memperluas scope sprint aktif.

## 2. Prinsip sequencing

1. Integritas ledger, auth/RLS, dan offline durability mendahului fitur pintar.
2. Receipt dan voice wajib menghasilkan draft yang bisa dikoreksi sebelum save.
3. Reporting/budget dibangun dari kontrak ledger yang sama, bukan salinan logika per layar.
4. Household, AI cloud, dan bank sync baru dibuka setelah telemetry, deletion, dan security gates stabil.
5. Setiap fase menghasilkan build yang dapat diuji pengguna, bukan lapisan teknis tanpa outcome.

## 3. Tahapan

### Phase 0 — Foundation (2–3 sprint)

**Scope:** workspace, CI, design tokens, navigation shell, environment separation, Supabase local/remote, schema baseline, RLS test harness, auth spike Google/Apple, encrypted SQLite, sync contract, observability redaction, EAS channels/runtimeVersion.

**Exit gate:** preview binary iOS/Android dapat login, membuat encrypted local record, sync ke tenant sendiri, gagal mengakses tenant lain, dan menerima/rollback OTA kompatibel.

### Phase 1 — Core Ledger Private Alpha (3–4 sprint)

**Fitur:** F01–F06, dasar F16, kontrol inti F24.

**Outcome:** pengguna dapat menyiapkan profil, account/wallet, category, income/expense/transfer/split, bekerja offline, mencari dan mengoreksi transaksi.

**Exit gate:** 0 kehilangan/duplikasi pada fault suite; transaction add median ≤15 detik; RLS suite penuh; crash-free ≥99,5% internal; export dasar tersedia untuk safety.

### Phase 2 — Capture & Daily Value Beta (3–4 sprint)

**Fitur:** F07, F08, F09, dasar F11, F13, F19.

**Outcome:** scan struk dan voice mempercepat capture; dashboard, budget, recurring reminder memberi alasan kembali harian/mingguan.

**Exit gate:** OCR total ≥95% dan voice parser F1 ≥0,92 pada corpus; 100% hasil dikonfirmasi; activation target terpenuhi; kill switch terbukti; external beta 100–500 pengguna.

### Phase 3 — Planning & Understanding (3–4 sprint)

**Fitur:** F10–F15 dan rekonsiliasi F16 lengkap.

**Outcome:** pengguna memahami cash flow/net worth, membuat goals/sinking funds, mengelola subscriptions/debt, dan melihat forecast yang jelas sebagai estimasi.

**Exit gate:** agregat sama dengan ledger golden tests; report p95 memenuhi NFR; forecast tidak dipersepsikan sebagai saldo pasti pada usability test; deletion/export end-to-end lulus.

### Phase 4 — Collaboration & Global Readiness (3–5 sprint)

**Fitur:** F17, F18 hardening, F19 widgets/shortcuts, F20, F23, F24 hardening.

**Outcome:** multi-currency, import/export matang, household permission per account, dan sync multi-device aman.

**Exit gate:** cross-tenant/cross-member adversarial tests lulus; currency invariants lulus; revocation offline aman; privacy/legal review Indonesia selesai; store submission checklist selesai.

### Phase 5 — Optional Intelligence & Connectivity (discovery + 4–8 sprint)

**Fitur:** F21 dan F22, hanya setelah keputusan vendor, biaya, consent, serta legal/security review.

**Outcome:** insights explainable dan koneksi read-only bank/e-wallet menurunkan beban input tanpa mengambil alih keputusan pengguna.

**Exit gate:** provider reliability/cost SLO; data processor agreement; consent/retention; reconciliation and disconnect flows; AI safety eval; controlled rollout ≤10% lalu bertahap.

## 4. Critical path

```text
Auth/RLS → Ledger & money model → Encrypted local repository → Sync/idempotency
        → Manual transactions → OCR/voice draft → Dashboard/budget/report
        → Household/multi-currency → Optional AI/bank providers
```

Design system, analytics taxonomy, test harness, privacy/deletion, dan release engineering berjalan sejak Phase 0 sebagai lintasan wajib, bukan pekerjaan akhir.

## 5. Rollout rings

| Ring | Audiens | Gate |
|---|---|---|
| R0 | Developer/internal | Unit/RLS/contract pass, development build |
| R1 | Team + trusted testers | Preview channel, synthetic data, manual critical journey |
| R2 | Private alpha 25–100 | Explicit consent, support channel, daily health review |
| R3 | External beta 100–500 | Store beta tracks, privacy notice, deletion/export, SLO dashboard |
| R4 | Limited production 5–10% | Crash/sync/security guardrails stable 48 jam |
| R5 | General availability | Product metrics, support readiness, backup/restore drill, policy review |

## 6. Go/no-go release gate

**No-go otomatis:** data loss/duplicate ledger, RLS bypass, attachment exposure, broken account deletion, incompatible OTA, high/critical reachable vulnerability, store policy blocker, crash-free di bawah target, atau rollback tidak teruji.

**Go bersyarat:** minor visual/accessibility defect hanya jika tidak menghalangi critical flow dan memiliki owner serta release terjadwal; tidak berlaku untuk privacy, security, atau integritas uang.

## 7. Discovery checkpoints

- Setelah Phase 1: validasi apakah masalah utama benar-benar kecepatan capture atau justru habit/education.
- Setelah Phase 2: bandingkan completion dan correction rate manual vs receipt vs voice.
- Sebelum Phase 4: validasi model visibility household dan kebutuhan multi-currency nyata.
- Sebelum Phase 5: ukur willingness-to-pay serta kebutuhan institusi Indonesia; jangan memilih vendor sebelum evidence dan procurement review.

## 8. Scope yang sengaja ditunda

Payment execution, card issuance, lending, trading, tax filing, payroll, crypto custody, dan personalized investment advice bukan bagian roadmap ini. Menambah salah satunya memerlukan PRD/regulatory track baru, bukan sekadar feature flag.
