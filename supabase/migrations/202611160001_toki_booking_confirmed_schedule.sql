-- Final agreed session schedule for public availability.
-- Preferred and alternate dates remain the original client-submitted choices.
-- Only confirmed_date is exposed indirectly as a public booked day by the TOKI calendar feed.

alter table public.toki_booking_requests
  add column confirmed_date date,
  add column confirmed_time text;

alter table public.toki_booking_requests
  add constraint toki_booking_confirmed_time_valid
  check (
    confirmed_time is null
    or confirmed_time = any (array['Morning'::text, 'Afternoon'::text, 'Evening'::text, 'Flexible'::text])
  );

alter table public.toki_booking_requests
  add constraint toki_booking_confirmed_requires_schedule
  check (
    status <> 'confirmed'
    or (confirmed_date is not null and confirmed_time is not null)
  );

create index toki_booking_requests_confirmed_date_idx
  on public.toki_booking_requests (confirmed_date)
  where status = 'confirmed';

comment on column public.toki_booking_requests.confirmed_date is
  'Final session date agreed with the client in writing. Used by the public TOKI availability calendar; never the original preferred or alternate date.';
comment on column public.toki_booking_requests.confirmed_time is
  'Final time window agreed with the client in writing. Kept private and used only in the owner booking dashboard.';
