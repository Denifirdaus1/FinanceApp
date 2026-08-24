begin;

select plan(2);

select has_extension('pgtap');

select is(
  (select count(*)::int from pg_tables where schemaname = 'public'),
  0,
  'fresh database starts with no public tables'
);

select * from finish();

rollback;