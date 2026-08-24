# Requirement Traceability Matrix

Matriks ini menunjukkan artefak minimum yang harus ikut berubah ketika sebuah fitur dikerjakan. Detail requirement dan acceptance criteria tetap berada di file fitur.

| ID | Phase | Entity/contract utama | Bukti test minimum | Metrik/guardrail utama |
|---|---:|---|---|---|
| F01 | 0–1 | `profiles`, `user_consents`, `device_installations`, Auth session, bootstrap RPC | OAuth/deep-link/session E2E + RLS | auth completion/error, no token leak |
| F02 | 1 | `profiles`, `user_preferences`, bundled `currency_catalog` | locale/currency/timezone tests | onboarding completion ≥70% |
| F03 | 1 | `accounts`, `asset_valuations`, `debts`, `loan_terms` | CRUD/archive/RLS/balance golden | account created, balance integrity |
| F04 | 1 | `categories`, `tags`, `merchants`, `entry_tags`, `classification_rules`, `classification_rule_amount_conditions` | rule precedence/revert/RLS | category correction rate |
| F05 | 1 | financial_entries, entry_splits | money/property/idempotency E2E | manual completion ≥97%, median time |
| F06 | 1 | `transfers`, `balance_adjustment_details`, `ledger_period_locks`, ledger RPC | net-zero/atomic/rounding/failure | duplicate/loss = 0 |
| F07 | 2 | `local_receipt_capture_sessions`, `attachments`, `receipt_extractions`, `receipt_extraction_items` | ≥300 receipt corpus + real devices | completion ≥85%, total accuracy ≥95% |
| F08 | 2 | `local_voice_capture_sessions`, `entity_aliases`, `financial_entries.source_metadata` | ≥500 utterance corpus + permissions | completion ≥88%, parser F1 ≥0,92 |
| F09 | 2 | `dashboard_preferences`, `daily_financial_snapshots`, dashboard RPC | source-ledger golden/performance | summary open, p95 latency |
| F10 | 3 | `report_presets`, `account_balance_snapshots`, report views/RPC | golden cashflow/net-worth/a11y | insight/report engagement |
| F11 | 2–3 | `budgets`, `budget_lines`, `budget_line_categories`, `budget_periods`, `budget_line_periods`, `budget_line_period_summaries`, `budget_adjustments` | rollover/pending/period tests | budget created/adherence |
| F12 | 3 | `goals`, `goal_account_links`, `goal_contributions`, `goal_target_history`, `goal_milestone_events` | target/progress/allocation | active goal/progress check-in |
| F13 | 2–3 | `recurring_rules`, `recurring_occurrences`, `recurring_rule_versions`, `recurring_reminders` | timezone/idempotent schedule | reminder action, duplicate = 0 |
| F14 | 3 | `debts`, `loan_terms`, `debt_ledger_entries`, `debt_payments`, `debt_statements`, `debt_schedule_entries` | principal/interest/allocation | plan completion; no advice claim |
| F15 | 3 | `calendar_preferences`, `forecast_scenarios`, `forecast_overrides`, `forecast_cache` | recurring/pending/rate uncertainty | forecast usage + accuracy band |
| F16 | 1–3 | `saved_searches`, `review_items`, `duplicate_links`, `reconciliation_sessions`, `reconciliation_session_items` | FTS/privacy/statement matching | review queue completion |
| F17 | 4 | `currencies`, `exchange_rates`, canonical `entry_splits` FX fields | exponent/rounding/as-of/property | missing/stale rate guardrail |
| F18 | 0–4 | SQLCipher, `local_outbox`, scope cursors, `sync_changes`, `mutation_deduplication` | fault injection/convergence | ≥99,5% sync ≤5 min; data loss 0 |
| F19 | 2–4 | `notification_preferences`, `device_installations`, `notification_jobs`, `notification_deliveries`, `notification_snoozes` | privacy/dedupe/deep-link/device | opt-in/open; sensitive leak 0 |
| F20 | 1–4 | `import_jobs`, `import_rows`, `data_export_jobs` | round-trip/formula/large file/RLS | export success, import rejection reasons |
| F21 | 5 | `user_consents`, `ai_sessions`, `ai_messages`, `ai_runs`, `ai_feedback`, `insight_snapshots` | grounding/injection/advice/cost eval | unauthorized tools 0; grounded ≥99% |
| F22 | 5 | `financial_connections`, `external_accounts`, `provider_sync_cursors`, `provider_events`, `external_transactions_staging`, `reconciliation_links`, `connection_consents` | OAuth/webhook/replay/duplicate | connection health + duplicate guardrail |
| F23 | 4 | `households`, `household_members`, `household_invitations`, `account_permissions`, `audit_events` | role×CRUD/revoke-offline/RLS | cross-tenant access 0 |
| F24 | 0–4 | `user_security_preferences`, `device_installations`, `user_consents`, `data_export_jobs`, `account_deletion_requests`, `audit_events` | MASVS/app-lock/delete/log scan | crash/security/privacy release gates |

## Cross-cutting release evidence

- `pnpm quality`, local Supabase reset, pgTAP RLS/RPC, contract tests, Maestro smoke, Expo Doctor.
- Real-device camera, microphone, biometrics, notifications, deep links, background/resume, SQLCipher, and EAS Update/rollback.
- Privacy notice, consent copy, data export, in-app deletion, web deletion resource, store privacy forms, dan processor inventory.
- Dashboard untuk crash-free, sync/outbox, RLS denial anomaly, OCR/voice quality, AI/provider cost, OTA adoption, dan binary distribution.
