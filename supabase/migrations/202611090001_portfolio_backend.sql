-- Legion portfolio: private inquiries, moderated comments, opt-in analytics, and audit trail.
-- Apply in the Supabase SQL editor or with `supabase db push` after reviewing the project.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 140),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new' check (status in ('new','in_progress','resolved','archived')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 60),
  body text not null check (char_length(body) between 3 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','hidden','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  path text not null check (char_length(path) between 1 and 100),
  viewed_at timestamptz not null default now()
);

-- This table stores only an HMAC digest of a short-lived request bucket, never a raw IP.
create table if not exists public.submission_rate_limits (
  bucket_hash text not null,
  scope text not null,
  window_start timestamptz not null,
  hit_count integer not null default 1,
  expires_at timestamptz not null,
  primary key (bucket_hash, scope, window_start)
);

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  record_type text not null,
  record_id uuid,
  summary text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to authenticated;

-- Atomic server-side quota bucket. Only the Edge Function's service-role key can call this.
create or replace function public.consume_portfolio_quota(
  p_bucket_hash text,
  p_scope text,
  p_limit integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  v_count integer;
begin
  insert into public.submission_rate_limits(bucket_hash, scope, window_start, hit_count, expires_at)
  values (p_bucket_hash, p_scope, v_window, 1, now() + interval '2 days')
  on conflict (bucket_hash, scope, window_start)
  do update set hit_count = public.submission_rate_limits.hit_count + 1,
                expires_at = now() + interval '2 days'
  returning hit_count into v_count;
  return v_count <= greatest(1, least(p_limit, 30));
end;
$$;

revoke all on function public.consume_portfolio_quota(text,text,integer) from public, anon, authenticated;
grant execute on function public.consume_portfolio_quota(text,text,integer) to service_role;

create or replace function public.log_portfolio_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_type text := tg_table_name;
  v_action text := lower(tg_op);
begin
  if tg_op = 'DELETE' then v_id := old.id; else v_id := new.id; end if;
  insert into public.admin_activity(actor_id, action, record_type, record_id, summary)
  values ((select auth.uid()), v_action, v_type, v_id,
          case when tg_op = 'UPDATE' then 'Administrator updated a record.'
               when tg_op = 'DELETE' then 'Administrator deleted a record.'
               else 'A record was created.' end);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create or replace function public.log_portfolio_admin_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_activity(actor_id, action, record_type, record_id, summary)
  values ((select auth.uid()), 'insert', tg_table_name, new.id, 'A record was created.');
  return new;
end;
$$;

create or replace function public.log_portfolio_admin_update_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if tg_op = 'DELETE' then v_id := old.id; else v_id := new.id; end if;
  insert into public.admin_activity(actor_id, action, record_type, record_id, summary)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id,
          case when tg_op = 'UPDATE' then 'Administrator updated a record.' else 'Administrator deleted a record.' end);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at before update on public.inquiries for each row execute function public.set_updated_at();
drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments for each row execute function public.set_updated_at();

drop trigger if exists inquiries_admin_audit on public.inquiries;
create trigger inquiries_admin_audit after update or delete on public.inquiries for each row execute function public.log_portfolio_admin_update_delete();
drop trigger if exists comments_admin_audit on public.comments;
create trigger comments_admin_audit after update or delete on public.comments for each row execute function public.log_portfolio_admin_update_delete();

alter table public.admin_users enable row level security;
alter table public.inquiries enable row level security;
alter table public.comments enable row level security;
alter table public.page_views enable row level security;
alter table public.submission_rate_limits enable row level security;
alter table public.admin_activity enable row level security;

-- The signed-in owner can only verify their own allowlist row. Writes are service-role/dashboard only.
drop policy if exists "admin reads own allowlist row" on public.admin_users;
create policy "admin reads own allowlist row" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- Every inquiry operation, including reads, edits, exports, archives, and deletes, is admin-only.
drop policy if exists "admins manage inquiries" on public.inquiries;
create policy "admins manage inquiries" on public.inquiries
  for all to authenticated using ((select public.is_portfolio_admin()))
  with check ((select public.is_portfolio_admin()));

-- Visitors can read approved comments only. The Edge Function uses service role for inserts.
drop policy if exists "public reads approved comments" on public.comments;
create policy "public reads approved comments" on public.comments
  for select to anon, authenticated using (status = 'approved' or (select public.is_portfolio_admin()));
drop policy if exists "admins manage comments" on public.comments;
create policy "admins manage comments" on public.comments
  for all to authenticated using ((select public.is_portfolio_admin()))
  with check ((select public.is_portfolio_admin()));

-- No public writes or reads for analytics, quotas, or audit records.
drop policy if exists "admins read page views" on public.page_views;
create policy "admins read page views" on public.page_views
  for select to authenticated using ((select public.is_portfolio_admin()));
drop policy if exists "admins read activity" on public.admin_activity;
create policy "admins read activity" on public.admin_activity
  for select to authenticated using ((select public.is_portfolio_admin()));

-- Least-privilege grants: anonymous users only get approved-comment reads.
revoke all on public.admin_users, public.inquiries, public.comments, public.page_views,
  public.submission_rate_limits, public.admin_activity from anon, authenticated;
grant select on public.comments to anon;
grant select on public.comments to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.inquiries to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select on public.page_views, public.admin_activity to authenticated;

-- Clean expired hashed quota buckets periodically from the SQL editor or a scheduled job:
-- delete from public.submission_rate_limits where expires_at < now();

comment on table public.inquiries is 'Private contact inquiries. Admin-only via RLS.';
comment on table public.comments is 'Public comments are visible only after administrator approval.';
comment on table public.page_views is 'Opt-in anonymous analytics: random session UUID, path, and timestamp only.';
comment on table public.admin_users is 'Manual owner allowlist. Never allow public writes.';

grant all on public.admin_users, public.inquiries, public.comments, public.page_views,
  public.submission_rate_limits, public.admin_activity to service_role;

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);
create index if not exists comments_status_created_idx on public.comments (status, created_at desc);
create index if not exists page_views_viewed_at_idx on public.page_views (viewed_at desc);
create index if not exists page_views_path_idx on public.page_views (path, viewed_at desc);
