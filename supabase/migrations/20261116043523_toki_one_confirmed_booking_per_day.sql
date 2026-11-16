-- Only one TOKI SATSUEI booking can occupy a publicly blocked date.
-- The public calendar represents whole-day availability, so one confirmed
-- booking per date is enforced at the database layer.

create unique index toki_booking_requests_one_confirmed_per_day_idx
  on public.toki_booking_requests (confirmed_date)
  where status = 'confirmed';

comment on index public.toki_booking_requests_one_confirmed_per_day_idx is
  'Enforces one publicly booked TOKI SATSUEI session per calendar date; the public calendar marks whole days as booked.';
