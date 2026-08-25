begin;

select plan(12);

select has_table(
  'public',
  'project_tracker_items',
  'project tracker table exists'
);

select ok(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'project_tracker_items'),
  'project tracker has RLS enabled'
);

select is(
  (select count(*)::int from public.project_tracker_items),
  89,
  'project tracker seeds the complete delivery plan'
);

select is(
  (select status from public.project_tracker_items where code = 'S04'),
  'in_progress',
  'S04 remains the active task'
);

select is(
  (select status from public.project_tracker_items where code = 'S04-MAESTRO'),
  'deferred',
  'cloud and device Maestro smoke is explicitly deferred'
);

select ok(
  has_table_privilege('anon', 'public.project_tracker_items', 'select'),
  'anonymous browser clients can read tracker rows'
);

select ok(
  not has_table_privilege('anon', 'public.project_tracker_items', 'insert'),
  'anonymous browser clients cannot insert tracker rows'
);

select ok(
  not has_table_privilege('anon', 'public.project_tracker_items', 'update'),
  'anonymous browser clients cannot update tracker rows'
);

select ok(
  has_table_privilege('authenticated', 'public.project_tracker_items', 'select'),
  'authenticated browser clients can read tracker rows'
);

select ok(
  not has_table_privilege('authenticated', 'public.project_tracker_items', 'delete'),
  'authenticated browser clients cannot delete tracker rows'
);

select is(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'public'
      and tablename = 'project_tracker_items'
      and cmd = 'SELECT'
  ),
  1,
  'tracker exposes one select-only RLS policy'
);

select is(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'public'
      and tablename = 'project_tracker_items'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'tracker exposes no mutation RLS policies'
);

select * from finish();

rollback;
