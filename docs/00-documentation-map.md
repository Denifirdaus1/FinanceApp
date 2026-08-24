# Peta Dokumentasi dan Source of Truth

## Tujuan

Dokumen ini mencegah persyaratan tersebar atau saling bertentangan. Bila ada konflik, gunakan prioritas berikut: PRD utama untuk keputusan produk, arsitektur/data/security untuk kontrak lintas fitur, lalu file fitur untuk perilaku rinci.

## Urutan baca

| Urutan | Dokumen | Fungsi |
|---:|---|---|
| 1 | `../prd.md` | Visi, target pengguna, scope, journeys, metrik, dan prioritas |
| 2 | `01-information-architecture.md` | Navigasi, layar, peran, serta state global |
| 3 | `02-ux-ui-design-system.md` | Bahasa visual pastel-warm, komponen, aksesibilitas |
| 4 | `03-technical-architecture.md` | Batas modul, data flow, client/backend, OTA |
| 5 | `04-data-model.md` | Skema Postgres/SQLite, constraint, RPC, RLS intent |
| 6 | `05-security-privacy-compliance.md` | Threat model, kontrol, privacy, compliance, incident response |
| 7 | `06-non-functional-requirements.md` | SLO dan kualitas terukur |
| 8 | `07-testing-quality.md` | Strategi pengujian dan release gates |
| 9 | `08-analytics-measurement.md` | Event, funnel, guardrail, dan dashboard |
| 10 | `09-roadmap-release-plan.md` | Tahap delivery dan exit criteria |
| 11 | `10-implementation-master-plan.md` | Checklist eksekusi lintas workstream |
| 12 | `superpowers/plans/2026-08-24-financeapp-master-task-list.md` | Urutan wajib setup, full UI, seluruh migration, implementasi, QA, dan release |
| 13 | `superpowers/plans/2026-08-24-financeapp-sequential-execution-list.md` | Focus gate dan checklist FE–BE–test untuk setiap fitur |
| 14 | `superpowers/plans/2026-08-24-financeapp-feature-dependency-map.md` | Dependency, consumer, integration edge, dan regression impact F01–F24 |
| 15 | `11-decisions-and-validation-questions.md` | Keputusan default dan pertanyaan validasi |
| 16 | `12-research-sources.md` | Bukti teknis, kebijakan distribusi, dan benchmark produk |
| 17 | `13-domain-glossary.md` | Istilah dan invariants domain yang wajib konsisten |
| 18 | `14-requirement-traceability.md` | Pemetaan fitur ke fase, data, test, dan metrik |
| 19 | `features/Fxx-*.md` | Spesifikasi mandiri dan implementasi per fitur |

## Registry fitur kanonis

| ID | Fitur | File |
|---|---|---|
| F01 | Onboarding & authentication | `features/F01-onboarding-auth.md` |
| F02 | Financial profile & preferences | `features/F02-financial-profile-preferences.md` |
| F03 | Accounts, wallets, assets & liabilities | `features/F03-accounts-wallets-assets-liabilities.md` |
| F04 | Categories, tags & automation rules | `features/F04-categories-tags-rules.md` |
| F05 | Manual transaction entry | `features/F05-manual-transaction.md` |
| F06 | Transfers, splits & adjustments | `features/F06-transfers-splits-adjustments.md` |
| F07 | Receipt scan & OCR | `features/F07-receipt-scan.md` |
| F08 | Voice entry | `features/F08-voice-entry.md` |
| F09 | Dashboard & daily summary | `features/F09-dashboard-daily-summary.md` |
| F10 | Reports, cash flow & net worth | `features/F10-reports-cashflow-net-worth.md` |
| F11 | Budgets | `features/F11-budgets.md` |
| F12 | Goals & sinking funds | `features/F12-goals-sinking-funds.md` |
| F13 | Recurring bills & subscriptions | `features/F13-recurring-bills-subscriptions.md` |
| F14 | Debts & loans | `features/F14-debt-loans.md` |
| F15 | Financial calendar & forecast | `features/F15-calendar-forecast.md` |
| F16 | Search, review & reconciliation | `features/F16-search-review-reconciliation.md` |
| F17 | Multi-currency | `features/F17-multi-currency.md` |
| F18 | Offline-first synchronization | `features/F18-offline-sync.md` |
| F19 | Notifications, widgets & shortcuts | `features/F19-notifications-widgets-shortcuts.md` |
| F20 | Import, export & backup | `features/F20-import-export-backup.md` |
| F21 | AI insights & assistant | `features/F21-ai-insights-assistant.md` |
| F22 | Bank & e-wallet sync | `features/F22-bank-ewallet-sync.md` |
| F23 | Household sharing | `features/F23-household-sharing.md` |
| F24 | Security, privacy & account controls | `features/F24-security-privacy-account-controls.md` |

## Aturan perubahan

- Setiap requirement baru mendapat ID dan ditautkan ke fitur, test, serta event yang relevan.
- Perubahan perhitungan uang harus mengubah spesifikasi data, acceptance test, dan migration plan bersama-sama.
- Perubahan native module, permission, entitlements, atau app configuration harus masuk jalur binary release, bukan OTA-only.
- File fitur tidak boleh melemahkan kontrol keamanan, privacy, atau tenant isolation dari dokumen lintas fitur.
- Angka target produk dapat dikalibrasi setelah pilot; definisi metrik dan event tidak boleh berubah tanpa versioning.
