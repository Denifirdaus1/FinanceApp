-- Stage 0 intentionally has no product tables or fixture rows.
-- Keep this deterministic seed file so every local reset and CI run follows
-- the same migration-then-seed lifecycle. Feature-owned seed data is added
-- alongside its forward-only migration in Stage 2.
begin;
commit;
