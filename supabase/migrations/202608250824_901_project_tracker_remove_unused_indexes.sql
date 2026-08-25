begin;

-- The tracker is a small, publicly readable engineering dataset. The primary
-- key and unique sort_order indexes cover its current API query pattern.
drop index if exists public.project_tracker_items_stage_sort_idx;
drop index if exists public.project_tracker_items_status_sort_idx;

commit;
