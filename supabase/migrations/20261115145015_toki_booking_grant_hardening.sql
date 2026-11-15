-- Make the TOKI booking table least-privilege even if project default grants are broad.
revoke all on table public.toki_booking_requests from public, anon;
revoke insert, references, trigger, truncate on table public.toki_booking_requests from authenticated;
grant select, update, delete on table public.toki_booking_requests to authenticated;
grant all on table public.toki_booking_requests to service_role;
