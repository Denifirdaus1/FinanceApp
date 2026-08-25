begin;

create table public.project_tracker_items (
  code text primary key,
  stage smallint not null check (stage between 0 and 5),
  stage_label text not null,
  workstream text not null,
  feature_code text,
  title text not null,
  description text not null,
  status text not null check (status in ('todo', 'in_progress', 'blocked', 'deferred', 'done')),
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  sort_order integer not null unique,
  depends_on text[] not null default '{}',
  blocker text,
  last_note text,
  source_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.project_tracker_items is
  'Public, non-sensitive FinanceApp engineering progress. Browser clients are read-only; updates are performed through trusted SQL/MCP access.';
comment on column public.project_tracker_items.blocker is
  'Engineering blocker only. Never store credentials, customer data, financial data, or private operational details.';

alter table public.project_tracker_items enable row level security;

revoke all on table public.project_tracker_items from public, anon, authenticated;
grant select on table public.project_tracker_items to anon, authenticated;
grant all on table public.project_tracker_items to service_role;

create policy "Public can read project tracker"
  on public.project_tracker_items
  for select
  to anon, authenticated
  using (true);

create index project_tracker_items_stage_sort_idx
  on public.project_tracker_items (stage, sort_order);

create index project_tracker_items_status_sort_idx
  on public.project_tracker_items (status, sort_order);

insert into public.project_tracker_items (
  code,
  stage,
  stage_label,
  workstream,
  feature_code,
  title,
  description,
  status,
  priority,
  sort_order,
  depends_on,
  blocker,
  last_note,
  source_path
)
values
  ('S00', 0, 'Foundation', 'Setup', null, 'Project scaffolding', 'pnpm workspace, Expo SDK 56, package boundaries, quality scripts, dan repository baseline.', 'done', 'critical', 10, '{}', null, 'Selesai dan ter-push ke main.', 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('S01', 0, 'Foundation', 'Setup', null, 'Environment & secret boundary', 'Validasi environment fail-closed dan pemisahan public configuration dari secret.', 'done', 'critical', 20, array['S00'], null, 'Selesai dan ter-push ke main.', 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('S02', 0, 'Foundation', 'Setup', null, 'Navigation, providers & error boundary', 'Application shell, session façade, route guards, bootstrap states, dan global error boundary.', 'done', 'high', 30, array['S01'], null, 'Selesai dan ter-push ke main.', 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('S03', 0, 'Foundation', 'Quality', null, 'Testing & CI foundation', 'Unified Jest, contract tests, pgTAP harness, secret scan, Expo export, dan GitHub Actions hijau.', 'done', 'critical', 40, array['S02'], null, 'CI penuh hijau pada main.', 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('S04', 0, 'Foundation', 'Infrastructure', null, 'Supabase & EAS baseline', 'Supabase local config, auth redirects, EAS profiles, runtime policy, dan development-build baseline.', 'in_progress', 'critical', 50, array['S03'], null, 'Konfigurasi baseline selesai; device smoke dipisahkan sebagai task tertunda.', 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('S04-MAESTRO', 0, 'Foundation', 'Testing', null, 'Maestro smoke Android + iOS', 'Cold-start, public route, authenticated shell, dan deep-link smoke pada Android serta iOS build/device.', 'deferred', 'high', 60, array['S04'], 'Ditunda atas keputusan owner: tetap di Expo Free plan dan jangan memicu build cloud baru.', 'Jalankan nanti saat build/device tersedia; tidak ada build EAS baru untuk task ini.', 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('S05', 0, 'Foundation', 'Security', null, 'Security, local DB & observability skeleton', 'SQLCipher key lifecycle, repository/outbox contracts, analytics redaction, app lock, purge, dan offline recovery tests.', 'todo', 'critical', 70, array['S04'], null, 'Task setup berikutnya setelah S04 ditutup atau scope defer disepakati.', 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),

  ('U00', 1, 'Full UI Wireframe', 'Design system', null, 'Warm pastel minimal design system', 'Cream/warm-neutral surfaces, pastel semantic accents, typography, spacing, motion, chart tokens, primitives, accessibility, dan API freeze.', 'todo', 'critical', 100, array['S05'], null, 'Awal Stage 1.', 'docs/02-ux-ui-design-system.md'),
  ('U01', 1, 'Full UI Wireframe', 'Navigation', null, 'Navigation & screen inventory', 'Route manifest F01–F24, bottom tabs, global capture, deep links, dan status catalog screen.', 'todo', 'critical', 110, array['U00'], null, null, 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('U02', 1, 'Full UI Wireframe', 'Feature UI', 'F01', 'Auth & account bootstrap wireframe', 'Welcome, Google/Apple sign-in, OAuth callback, session bootstrap, auth error, dan account bootstrap.', 'todo', 'high', 120, array['U01'], null, null, 'docs/features/F01-auth-account-bootstrap.md'),
  ('U03', 1, 'Full UI Wireframe', 'Feature UI', 'F02', 'Profile & financial setup wireframe', 'Financial setup, currency/locale/timezone, privacy/analytics preference, dan edit profile.', 'todo', 'high', 130, array['U02'], null, null, 'docs/features/F02-user-financial-profile.md'),
  ('U04', 1, 'Full UI Wireframe', 'Feature UI', 'F03', 'Accounts wireframe', 'Accounts list/detail/create/edit/archive, asset valuation, dan liability/debt shell.', 'todo', 'high', 140, array['U03'], null, null, 'docs/features/F03-accounts-assets-liabilities.md'),
  ('U05', 1, 'Full UI Wireframe', 'Feature UI', 'F04', 'Categories, tags & rules wireframe', 'Category/tag list, create/edit, hierarchy, dan classification rule editor/test result.', 'todo', 'high', 150, array['U04'], null, null, 'docs/features/F04-categories-tags-rules.md'),
  ('U06', 1, 'Full UI Wireframe', 'Feature UI', 'F05', 'Transactions wireframe', 'Transaction composer, review, detail, edit, duplicate warning, void, dan restore.', 'todo', 'critical', 160, array['U05'], null, null, 'docs/features/F05-manual-transactions.md'),
  ('U07', 1, 'Full UI Wireframe', 'Feature UI', 'F06', 'Transfers & splits wireframe', 'Transfer composer, split editor, adjustment, reversal, dan locked-period error.', 'todo', 'critical', 170, array['U06'], null, null, 'docs/features/F06-transfers-splits-adjustments.md'),
  ('U08', 1, 'Full UI Wireframe', 'Feature UI', 'F17', 'Multi-currency wireframe', 'Currency settings, FX source, missing-rate state, dan cross-currency transfer review.', 'todo', 'high', 180, array['U07'], null, null, 'docs/features/F17-multi-currency-fx.md'),
  ('U09', 1, 'Full UI Wireframe', 'Feature UI', 'F18', 'Offline sync wireframe', 'Sync status, retry, pending mutations, conflict resolution, dan revoked-access purge notice.', 'todo', 'critical', 190, array['U08'], null, null, 'docs/features/F18-offline-sync-conflicts.md'),
  ('U10', 1, 'Full UI Wireframe', 'Feature UI', 'F07', 'Receipt capture & OCR wireframe', 'Camera/gallery/PDF entry, crop, OCR progress, correction/review, dan receipt detail.', 'todo', 'high', 200, array['U09'], null, null, 'docs/features/F07-receipt-upload-ocr.md'),
  ('U11', 1, 'Full UI Wireframe', 'Feature UI', 'F08', 'Voice command wireframe', 'Permission, listening, transcript/intent review, ambiguity resolution, dan manual fallback.', 'todo', 'high', 210, array['U10'], null, null, 'docs/features/F08-voice-command.md'),
  ('U12', 1, 'Full UI Wireframe', 'Feature UI', 'F09', 'Dashboard & summary wireframe', 'Dashboard, period switcher, daily summary, balance cards, empty, partial-FX, dan offline states.', 'todo', 'high', 220, array['U11'], null, null, 'docs/features/F09-dashboard-summary.md'),
  ('U13', 1, 'Full UI Wireframe', 'Feature UI', 'F10', 'Reports wireframe', 'Reports hub, cash flow, category trend, net worth, drill-down, dan export entry.', 'todo', 'high', 230, array['U12'], null, null, 'docs/features/F10-reports-analytics.md'),
  ('U14', 1, 'Full UI Wireframe', 'Feature UI', 'F11', 'Budgets wireframe', 'Budget list/detail, lines, allocation, transfer adjustment, dan threshold state.', 'todo', 'high', 240, array['U13'], null, null, 'docs/features/F11-budgets.md'),
  ('U15', 1, 'Full UI Wireframe', 'Feature UI', 'F12', 'Financial goals wireframe', 'Goal list/detail, linked accounts, contribution/withdrawal, dan missing-rate state.', 'todo', 'medium', 250, array['U14'], null, null, 'docs/features/F12-financial-goals.md'),
  ('U16', 1, 'Full UI Wireframe', 'Feature UI', 'F13', 'Recurring transactions wireframe', 'Recurring list/detail/editor, generated occurrence, match/review, skip, dan snooze.', 'todo', 'high', 260, array['U15'], null, null, 'docs/features/F13-recurring-transactions.md'),
  ('U17', 1, 'Full UI Wireframe', 'Feature UI', 'F14', 'Debt management wireframe', 'Debt list/detail, terms, payment breakdown, statement, dan payoff projection disclaimer.', 'todo', 'medium', 270, array['U16'], null, null, 'docs/features/F14-debt-management.md'),
  ('U18', 1, 'Full UI Wireframe', 'Feature UI', 'F15', 'Calendar & forecast wireframe', 'Calendar month/day, forecast timeline, scenario editor, dan low-balance explanation.', 'todo', 'medium', 280, array['U17'], null, null, 'docs/features/F15-calendar-forecast.md'),
  ('U19', 1, 'Full UI Wireframe', 'Feature UI', 'F16', 'Search & reconciliation wireframe', 'Search/filter, saved search, review inbox, duplicate comparison, dan reconciliation session.', 'todo', 'medium', 290, array['U18'], null, null, 'docs/features/F16-search-review-reconciliation.md'),
  ('U20', 1, 'Full UI Wireframe', 'Feature UI', 'F20', 'Import & export wireframe', 'Import wizard, mapping, preview, row errors, commit result, dan privacy-export status.', 'todo', 'medium', 300, array['U19'], null, null, 'docs/features/F20-import-export.md'),
  ('U21', 1, 'Full UI Wireframe', 'Feature UI', 'F23', 'Household sharing wireframe', 'Household settings, invite/join, roles, per-account permission, dan revoke audit.', 'todo', 'high', 310, array['U20'], null, null, 'docs/features/F23-household-sharing.md'),
  ('U22', 1, 'Full UI Wireframe', 'Feature UI', 'F24', 'Security & privacy wireframe', 'Security hub, app lock, privacy mode, sessions, consents, export, dan delete-account flow.', 'todo', 'critical', 320, array['U21'], null, null, 'docs/features/F24-security-privacy.md'),
  ('U23', 1, 'Full UI Wireframe', 'Feature UI', 'F19', 'Notifications & widgets wireframe', 'Notification preferences, snooze, widget privacy, shortcut setup, dan deep-link failure.', 'todo', 'medium', 330, array['U22'], null, null, 'docs/features/F19-notifications-widgets.md'),
  ('U24', 1, 'Full UI Wireframe', 'Feature UI', 'F21', 'AI insights wireframe', 'AI consent, insight feed, assistant, source explanation, feedback, dan unavailable state.', 'todo', 'low', 340, array['U23'], null, null, 'docs/features/F21-ai-insights-assistant.md'),
  ('U25', 1, 'Full UI Wireframe', 'Feature UI', 'F22', 'Connections wireframe', 'Provider consent, account mapping, staging/reconciliation, sync/error, dan revoke.', 'todo', 'low', 350, array['U24'], null, null, 'docs/features/F22-financial-connections.md'),

  ('D000', 2, 'Database Foundation', 'Migration', null, 'Foundation database migration', 'Extensions, currencies, sync/audit columns, helper schema, grants, dan timestamp/version helpers.', 'todo', 'critical', 400, array['U25'], null, null, 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('D001', 2, 'Database Foundation', 'Migration', 'F01', 'F01 auth & household migration', 'Profiles, consents, device installations, households, members, invitations, dan auth triggers.', 'todo', 'critical', 410, array['D000'], null, null, 'docs/features/F01-auth-account-bootstrap.md'),
  ('D002', 2, 'Database Foundation', 'Migration', 'F02', 'F02 preferences migration', 'User preferences dan user-scope sync.', 'todo', 'high', 420, array['D001'], null, null, 'docs/features/F02-user-financial-profile.md'),
  ('D003', 2, 'Database Foundation', 'Migration', 'F03', 'F03 accounts migration', 'Accounts, permissions, valuations, debt shell, dan account balance RPC.', 'todo', 'critical', 430, array['D002'], null, null, 'docs/features/F03-accounts-assets-liabilities.md'),
  ('D004', 2, 'Database Foundation', 'Migration', 'F04', 'F04 classification migration', 'Categories, tags, entry tags, classification rules, dan conditions.', 'todo', 'high', 440, array['D003'], null, null, 'docs/features/F04-categories-tags-rules.md'),
  ('D005', 2, 'Database Foundation', 'Migration', 'F05', 'F05 ledger migration', 'Merchants, entries, splits, deduplication, audit events, dan ledger RPCs.', 'todo', 'critical', 450, array['D004'], null, null, 'docs/features/F05-manual-transactions.md'),
  ('D006', 2, 'Database Foundation', 'Migration', 'F06', 'F06 transfer migration', 'Transfers, adjustment details, period locks, transfer, dan reversal RPCs.', 'todo', 'critical', 460, array['D005'], null, null, 'docs/features/F06-transfers-splits-adjustments.md'),
  ('D007', 2, 'Database Foundation', 'Migration', 'F17', 'F17 FX migration', 'Exchange rates, reporting amount/rate constraints, dan FX lookup contracts.', 'todo', 'high', 470, array['D006'], null, null, 'docs/features/F17-multi-currency-fx.md'),
  ('D008', 2, 'Database Foundation', 'Migration', 'F18', 'F18 sync migration', 'Sync changes, pull/push RPCs, cursors, purge directives, dan local schema version.', 'todo', 'critical', 480, array['D007'], null, null, 'docs/features/F18-offline-sync-conflicts.md'),
  ('D009', 2, 'Database Foundation', 'Migration', 'F07', 'F07 receipt migration', 'Attachments, receipt extraction/items, private bucket policies, dan confirm-capture RPC.', 'todo', 'critical', 490, array['D008'], null, null, 'docs/features/F07-receipt-upload-ocr.md'),
  ('D010', 2, 'Database Foundation', 'Migration', 'F08', 'F08 voice provenance migration', 'Entity aliases dan allowed provenance only; tidak menyimpan raw audio/transcript/session server-side.', 'todo', 'high', 500, array['D009'], null, null, 'docs/features/F08-voice-command.md'),
  ('D011', 2, 'Database Foundation', 'Migration', 'F09', 'F09 dashboard migration', 'Dashboard preferences dan permission-scoped derived snapshots.', 'todo', 'high', 510, array['D010'], null, null, 'docs/features/F09-dashboard-summary.md'),
  ('D012', 2, 'Database Foundation', 'Migration', 'F10', 'F10 reports migration', 'Report presets dan rebuildable balance snapshots.', 'todo', 'high', 520, array['D011'], null, null, 'docs/features/F10-reports-analytics.md'),
  ('D013', 2, 'Database Foundation', 'Migration', 'F11', 'F11 budgets migration', 'Budgets, lines, category joins, periods, adjustments, dan derived summaries.', 'todo', 'high', 530, array['D012'], null, null, 'docs/features/F11-budgets.md'),
  ('D014', 2, 'Database Foundation', 'Migration', 'F12', 'F12 goals migration', 'Goals, account links, contributions, target history, dan milestone events.', 'todo', 'medium', 540, array['D013'], null, null, 'docs/features/F12-financial-goals.md'),
  ('D015', 2, 'Database Foundation', 'Migration', 'F13', 'F13 recurring migration', 'Recurring rules, versions, occurrences, reminders, generation, dan match RPCs.', 'todo', 'high', 550, array['D014'], null, null, 'docs/features/F13-recurring-transactions.md'),
  ('D016', 2, 'Database Foundation', 'Migration', 'F14', 'F14 debt migration', 'Debts, loan terms, ledger links, payment groups, statements, dan schedules.', 'todo', 'medium', 560, array['D015'], null, null, 'docs/features/F14-debt-management.md'),
  ('D017', 2, 'Database Foundation', 'Migration', 'F15', 'F15 forecast migration', 'Calendar preferences, scenarios, overrides, dan permission-scoped forecast cache.', 'todo', 'medium', 570, array['D016'], null, null, 'docs/features/F15-calendar-forecast.md'),
  ('D018', 2, 'Database Foundation', 'Migration', 'F16', 'F16 review migration', 'Saved searches, review items, duplicate links, reconciliation sessions, dan items.', 'todo', 'medium', 580, array['D017'], null, null, 'docs/features/F16-search-review-reconciliation.md'),
  ('D019', 2, 'Database Foundation', 'Migration', 'F20', 'F20 import/export migration', 'Import jobs/rows, export jobs, dan private temporary bucket policies.', 'todo', 'medium', 590, array['D018'], null, null, 'docs/features/F20-import-export.md'),
  ('D020', 2, 'Database Foundation', 'Migration', 'F23', 'F23 sharing hardening migration', 'Household roles/permissions, invite/revoke RPCs, dan visibility-scoped audit.', 'todo', 'critical', 600, array['D019'], null, null, 'docs/features/F23-household-sharing.md'),
  ('D021', 2, 'Database Foundation', 'Migration', 'F24', 'F24 security lifecycle migration', 'Security preferences, consent/account deletion lifecycle, dan session/device projections.', 'todo', 'critical', 610, array['D020'], null, null, 'docs/features/F24-security-privacy.md'),
  ('D022', 2, 'Database Foundation', 'Migration', 'F19', 'F19 notification migration', 'Preferences, jobs, deliveries, snoozes, dan scheduler deduplication.', 'todo', 'medium', 620, array['D021'], null, null, 'docs/features/F19-notifications-widgets.md'),
  ('D023', 2, 'Database Foundation', 'Migration', 'F21', 'F21 AI data migration', 'AI sessions/messages/runs/feedback/insights dengan explicit consent dan retention.', 'todo', 'low', 630, array['D022'], null, null, 'docs/features/F21-ai-insights-assistant.md'),
  ('D024', 2, 'Database Foundation', 'Migration', 'F22', 'F22 connections migration', 'Connections, external accounts, cursors/events, staging, reconciliation links, dan consents.', 'todo', 'low', 640, array['D023'], null, null, 'docs/features/F22-financial-connections.md'),

  ('I-F01', 3, 'Feature Integration', 'Vertical slice', 'F01', 'Integrate F01 — Auth & account bootstrap', 'TDD dari domain/local repository ke UI, Supabase, sync, security, analytics, dan E2E; tutup sebelum fitur berikutnya.', 'todo', 'critical', 700, array['D024','U02'], null, null, 'docs/features/F01-auth-account-bootstrap.md'),
  ('I-F02', 3, 'Feature Integration', 'Vertical slice', 'F02', 'Integrate F02 — Profile & financial setup', 'Aktivasi vertikal penuh setelah F01 DONE dan dependency regression lulus.', 'todo', 'high', 710, array['I-F01','D002','U03'], null, null, 'docs/features/F02-user-financial-profile.md'),
  ('I-F03', 3, 'Feature Integration', 'Vertical slice', 'F03', 'Integrate F03 — Accounts', 'Aktivasi accounts, balances, asset valuation, dan permission boundary.', 'todo', 'critical', 720, array['I-F02','D003','U04'], null, null, 'docs/features/F03-accounts-assets-liabilities.md'),
  ('I-F04', 3, 'Feature Integration', 'Vertical slice', 'F04', 'Integrate F04 — Categories, tags & rules', 'Aktivasi classification stack dan integrasi consumer accounts/transactions.', 'todo', 'high', 730, array['I-F03','D004','U05'], null, null, 'docs/features/F04-categories-tags-rules.md'),
  ('I-F05', 3, 'Feature Integration', 'Vertical slice', 'F05', 'Integrate F05 — Transactions', 'Aktivasi transaction ledger, splits, void/restore, dedupe, offline, dan audit.', 'todo', 'critical', 740, array['I-F04','D005','U06'], null, null, 'docs/features/F05-manual-transactions.md'),
  ('I-F06', 3, 'Feature Integration', 'Vertical slice', 'F06', 'Integrate F06 — Transfers & adjustments', 'Aktivasi atomic transfer, split, adjustment, reversal, dan locked-period handling.', 'todo', 'critical', 750, array['I-F05','D006','U07'], null, null, 'docs/features/F06-transfers-splits-adjustments.md'),
  ('I-F17', 3, 'Feature Integration', 'Vertical slice', 'F17', 'Integrate F17 — Multi-currency & FX', 'Aktivasi currency settings, rate resolution, missing-rate, dan cross-currency consumers.', 'todo', 'high', 760, array['I-F06','D007','U08'], null, null, 'docs/features/F17-multi-currency-fx.md'),
  ('I-F18', 3, 'Feature Integration', 'Vertical slice', 'F18', 'Integrate F18 — Offline sync & conflict', 'Aktivasi outbox, retry, idempotency, conflict resolution, dan revoked-access purge.', 'todo', 'critical', 770, array['I-F17','D008','U09'], null, null, 'docs/features/F18-offline-sync-conflicts.md'),
  ('I-F07', 3, 'Feature Integration', 'Vertical slice', 'F07', 'Integrate F07 — Receipt capture & OCR', 'Aktivasi secure receipt capture, local OCR review, private storage, dan transaction link.', 'todo', 'high', 780, array['I-F18','D009','U10'], null, null, 'docs/features/F07-receipt-upload-ocr.md'),
  ('I-F08', 3, 'Feature Integration', 'Vertical slice', 'F08', 'Integrate F08 — Voice command', 'Aktivasi permission, local transcript/intent review, ambiguity resolution, dan manual fallback.', 'todo', 'high', 790, array['I-F07','D010','U11'], null, null, 'docs/features/F08-voice-command.md'),
  ('I-F09', 3, 'Feature Integration', 'Vertical slice', 'F09', 'Integrate F09 — Dashboard & summary', 'Aktivasi permission-scoped dashboard, daily summary, offline, dan partial-FX states.', 'todo', 'high', 800, array['I-F08','D011','U12'], null, null, 'docs/features/F09-dashboard-summary.md'),
  ('I-F10', 3, 'Feature Integration', 'Vertical slice', 'F10', 'Integrate F10 — Reports', 'Aktivasi reports, trends, net worth, drill-down, dan export entry.', 'todo', 'high', 810, array['I-F09','D012','U13'], null, null, 'docs/features/F10-reports-analytics.md'),
  ('I-F11', 3, 'Feature Integration', 'Vertical slice', 'F11', 'Integrate F11 — Budgets', 'Aktivasi budgets, allocations, adjustments, thresholds, dan dashboard/report edges.', 'todo', 'high', 820, array['I-F10','D013','U14'], null, null, 'docs/features/F11-budgets.md'),
  ('I-F12', 3, 'Feature Integration', 'Vertical slice', 'F12', 'Integrate F12 — Financial goals', 'Aktivasi goal tracking, linked accounts, contributions, withdrawals, dan FX behavior.', 'todo', 'medium', 830, array['I-F11','D014','U15'], null, null, 'docs/features/F12-financial-goals.md'),
  ('I-F13', 3, 'Feature Integration', 'Vertical slice', 'F13', 'Integrate F13 — Recurring transactions', 'Aktivasi recurring engine, occurrence generation, match/review, skip, dan snooze.', 'todo', 'high', 840, array['I-F12','D015','U16'], null, null, 'docs/features/F13-recurring-transactions.md'),
  ('I-F14', 3, 'Feature Integration', 'Vertical slice', 'F14', 'Integrate F14 — Debt management', 'Aktivasi debt terms, payment grouping, statement, dan payoff projection disclaimer.', 'todo', 'medium', 850, array['I-F13','D016','U17'], null, null, 'docs/features/F14-debt-management.md'),
  ('I-F15', 3, 'Feature Integration', 'Vertical slice', 'F15', 'Integrate F15 — Calendar & forecast', 'Aktivasi calendar, scenarios, low-balance forecast, dan explainable projections.', 'todo', 'medium', 860, array['I-F14','D017','U18'], null, null, 'docs/features/F15-calendar-forecast.md'),
  ('I-F16', 3, 'Feature Integration', 'Vertical slice', 'F16', 'Integrate F16 — Search & reconciliation', 'Aktivasi saved search, review inbox, duplicate handling, dan reconciliation workflow.', 'todo', 'medium', 870, array['I-F15','D018','U19'], null, null, 'docs/features/F16-search-review-reconciliation.md'),
  ('I-F20', 3, 'Feature Integration', 'Vertical slice', 'F20', 'Integrate F20 — Import & export', 'Aktivasi mapping, validation, atomic import, export, dan temporary private storage lifecycle.', 'todo', 'medium', 880, array['I-F16','D019','U20'], null, null, 'docs/features/F20-import-export.md'),
  ('I-F23', 3, 'Feature Integration', 'Vertical slice', 'F23', 'Integrate F23 — Household sharing', 'Aktivasi invites, roles, per-account permissions, revoke, purge, dan audit visibility.', 'todo', 'critical', 890, array['I-F20','D020','U21'], null, null, 'docs/features/F23-household-sharing.md'),
  ('I-F24', 3, 'Feature Integration', 'Vertical slice', 'F24', 'Integrate F24 — Security & privacy', 'Aktivasi app lock, privacy mode, sessions, consent, export, dan account deletion lifecycle.', 'todo', 'critical', 900, array['I-F23','D021','U22'], null, null, 'docs/features/F24-security-privacy.md'),
  ('I-F19', 3, 'Feature Integration', 'Vertical slice', 'F19', 'Integrate F19 — Notifications & widgets', 'Aktivasi preferences, delivery, snooze, widget privacy, shortcuts, dan deep links.', 'todo', 'medium', 910, array['I-F24','D022','U23'], null, null, 'docs/features/F19-notifications-widgets.md'),
  ('I-F21', 3, 'Feature Integration', 'Vertical slice', 'F21', 'Integrate F21 — AI insights & assistant', 'Aktivasi explicit-consent AI, explainable sources, retention, redaction, feedback, dan fallback.', 'todo', 'low', 920, array['I-F19','D023','U24'], null, null, 'docs/features/F21-ai-insights-assistant.md'),
  ('I-F22', 3, 'Feature Integration', 'Vertical slice', 'F22', 'Integrate F22 — Financial connections', 'Aktivasi provider consent, account mapping, staging, reconciliation, sync, error, dan revoke.', 'todo', 'low', 930, array['I-F21','D024','U25'], null, null, 'docs/features/F22-financial-connections.md'),

  ('Q01', 4, 'QA & Hardening', 'Quality', null, 'Full regression', 'Quality gates, all Maestro suites, lifecycle/device/offline/conflict/timezone/FX matrix, dan ledger integrity.', 'todo', 'critical', 1000, array['I-F22'], null, null, 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('Q02', 4, 'QA & Hardening', 'Security', null, 'Security & privacy audit', 'RLS/Storage matrix, secret/dependency/license/MASVS checks, traffic proof, deletion drill, dan hostile-fixture redaction audit.', 'todo', 'critical', 1010, array['Q01'], null, null, 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('Q03', 4, 'QA & Hardening', 'Accessibility', null, 'Accessibility, performance & resilience', 'VoiceOver/TalkBack, 200% font, 320 px, contrast, reduce motion, profiling, provider outage, disk full, dan recovery matrix.', 'todo', 'high', 1020, array['Q02'], null, null, 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),
  ('Q04', 4, 'QA & Hardening', 'Release readiness', null, 'Store readiness & rollout drill', 'Signed internal builds, real-device smoke, privacy/store metadata, dan EAS Update compatibility/rollback drill.', 'todo', 'critical', 1030, array['Q03'], null, null, 'docs/superpowers/plans/2026-08-24-financeapp-master-task-list.md'),

  ('R01', 5, 'Release', 'Release', null, 'Closed beta', 'Distribusi closed beta setelah seluruh release gate dan store readiness lulus.', 'todo', 'high', 1100, array['Q04'], null, null, 'docs/04-delivery-roadmap-release-plan.md'),
  ('R02', 5, 'Release', 'Release', null, 'Staged production rollout', 'Rollout bertahap dengan monitoring, incident criteria, rollback path, dan cohort health.', 'todo', 'critical', 1110, array['R01'], null, null, 'docs/04-delivery-roadmap-release-plan.md'),
  ('R03', 5, 'Release', 'Release', null, 'General availability gate', 'GA hanya setelah stability, security, privacy, support, dan business gates disetujui.', 'todo', 'critical', 1120, array['R02'], null, null, 'docs/04-delivery-roadmap-release-plan.md');

-- Trusted updates must set updated_at explicitly, for example:
-- update public.project_tracker_items
-- set status = 'done', last_note = 'Evidence link', updated_at = now()
-- where code = 'S05';

commit;
