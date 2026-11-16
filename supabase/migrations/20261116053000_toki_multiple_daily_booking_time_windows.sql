-- Replace whole-day booking uniqueness with precise, non-overlapping time windows.
-- Multiple sessions may share one date as long as their confirmed times do not overlap.

drop index if exists public.toki_booking_requests_one_confirmed_per_day_idx;

alter table public.toki_booking_requests
  add column confirmed_start_time time without time zone,
  add column confirmed_end_time time without time zone;

alter table public.toki_booking_requests
  drop constraint if exists toki_booking_confirmed_requires_schedule;

alter table public.toki_booking_requests
  add constraint toki_booking_confirmed_requires_exact_schedule
  check (
    status <> 'confirmed'
    or (
      confirmed_date is not null
      and confirmed_start_time is not null
      and confirmed_end_time is not null
      and confirmed_start_time < confirmed_end_time
    )
  );

alter table public.toki_booking_requests
  add constraint toki_booking_no_overlapping_confirmed_time_windows
  exclude using gist (
    tsrange(
      confirmed_date + confirmed_start_time,
      confirmed_date + confirmed_end_time,
      '[)'
    ) with &&
  )
  where (status = 'confirmed');

drop index if exists public.toki_booking_requests_confirmed_date_idx;

create index toki_booking_requests_confirmed_schedule_idx
  on public.toki_booking_requests (confirmed_date, confirmed_start_time)
  where status = 'confirmed';

comment on column public.toki_booking_requests.confirmed_start_time is
  'Final agreed local start time in Asia/Manila. Public calendar may display this time without booking identity.';
comment on column public.toki_booking_requests.confirmed_end_time is
  'Final agreed local end time in Asia/Manila. Database exclusion constraint prevents overlapping confirmed sessions.';
comment on constraint toki_booking_no_overlapping_confirmed_time_windows on public.toki_booking_requests is
  'Confirmed TOKI sessions may share a calendar date only when their half-open time ranges do not overlap.';
