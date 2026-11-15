-- TOKI SATSUEI booking requests.
-- Public visitors submit only through the rate-limited portfolio-submit Edge Function.
-- Direct anonymous Data API access is deliberately not granted.

create table public.toki_booking_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique
    check (reference_code ~ '^TOKI-[A-Z0-9]{8}$'),
  name text not null
    check (char_length(name) between 1 and 100),
  contact_method text not null
    check (contact_method in ('instagram', 'facebook', 'email')),
  contact_value text not null
    check (char_length(contact_value) between 2 and 254),
  session_type text not null
    check (session_type in (
      'Quick Snap',
      'Toki Portraits',
      'Signature Session',
      'Duo Session',
      'Outdoor session',
      'Event coverage',
      'Custom session'
    )),
  preferred_date date not null,
  alternate_date date,
  preferred_time text not null
    check (preferred_time in ('Morning', 'Afternoon', 'Evening', 'Flexible')),
  location text not null
    check (char_length(location) between 2 and 200),
  participants integer not null default 1
    check (participants between 1 and 12),
  notes text not null
    check (char_length(notes) between 10 and 2000),
  privacy_consent boolean not null
    check (privacy_consent is true),
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'confirmed', 'declined', 'cancelled')),
  admin_notes text
    check (admin_notes is null or char_length(admin_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint toki_booking_alternate_date_valid
    check (alternate_date is null or alternate_date <> preferred_date)
);

comment on table public.toki_booking_requests is
  'Private TOKI SATSUEI booking requests. Public visitors submit only through the rate-limited portfolio-submit Edge Function.';

create index toki_booking_requests_created_at_idx
  on public.toki_booking_requests (created_at desc);
create index toki_booking_requests_status_created_at_idx
  on public.toki_booking_requests (status, created_at desc);

alter table public.toki_booking_requests enable row level security;

revoke all on table public.toki_booking_requests from public, anon;
grant select, update, delete on table public.toki_booking_requests to authenticated;
grant all on table public.toki_booking_requests to service_role;

create policy "portfolio admins read TOKI booking requests"
  on public.toki_booking_requests
  for select to authenticated
  using ((select private.is_portfolio_admin()));

create policy "portfolio admins update TOKI booking requests"
  on public.toki_booking_requests
  for update to authenticated
  using ((select private.is_portfolio_admin()))
  with check ((select private.is_portfolio_admin()));

create policy "portfolio admins delete TOKI booking requests"
  on public.toki_booking_requests
  for delete to authenticated
  using ((select private.is_portfolio_admin()));

create trigger toki_booking_requests_set_updated_at
  before update on public.toki_booking_requests
  for each row execute function public.set_updated_at();

create trigger toki_booking_requests_admin_audit
  after update or delete on public.toki_booking_requests
  for each row execute function private.log_portfolio_admin_update_delete();
