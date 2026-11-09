-- Harden portfolio authorization helpers after the initial backend schema.
-- Internal SECURITY DEFINER functions live in a non-exposed schema.
-- The public comment read path no longer invokes an admin helper for anon users.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_portfolio_admin() from public, anon, authenticated;
grant execute on function private.is_portfolio_admin() to authenticated;

drop policy if exists "public reads approved comments" on public.comments;
drop policy if exists "admins manage comments" on public.comments;

create policy "public reads approved comments" on public.comments
  for select to anon using (status = 'approved');

create policy "admins read comments" on public.comments
  for select to authenticated using ((select private.is_portfolio_admin()));

create policy "admins insert comments" on public.comments
  for insert to authenticated with check ((select private.is_portfolio_admin()));

create policy "admins update comments" on public.comments
  for update to authenticated
  using ((select private.is_portfolio_admin()))
  with check ((select private.is_portfolio_admin()));

create policy "admins delete comments" on public.comments
  for delete to authenticated using ((select private.is_portfolio_admin()));

drop policy if exists "admins manage inquiries" on public.inquiries;
create policy "admins manage inquiries" on public.inquiries
  for all to authenticated
  using ((select private.is_portfolio_admin()))
  with check ((select private.is_portfolio_admin()));

drop policy if exists "admins read page views" on public.page_views;
create policy "admins read page views" on public.page_views
  for select to authenticated using ((select private.is_portfolio_admin()));

drop policy if exists "admins read activity" on public.admin_activity;
create policy "admins read activity" on public.admin_activity
  for select to authenticated using ((select private.is_portfolio_admin()));

revoke all on function public.consume_portfolio_quota(text, text, integer) from public, anon, authenticated;
grant execute on function public.consume_portfolio_quota(text, text, integer) to service_role;

drop trigger if exists inquiries_admin_audit on public.inquiries;
drop trigger if exists comments_admin_audit on public.comments;

drop function if exists public.log_portfolio_admin_change();
drop function if exists public.log_portfolio_admin_insert();
drop function if exists public.log_portfolio_admin_update_delete();

create or replace function private.log_portfolio_admin_update_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if tg_op = 'DELETE' then v_id := old.id; else v_id := new.id; end if;
  insert into public.admin_activity(actor_id, action, record_type, record_id, summary)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id,
          case when tg_op = 'UPDATE' then 'Administrator updated a record.'
               else 'Administrator deleted a record.' end);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function private.log_portfolio_admin_update_delete() from public, anon, authenticated;

create trigger inquiries_admin_audit
  after update or delete on public.inquiries
  for each row execute function private.log_portfolio_admin_update_delete();

create trigger comments_admin_audit
  after update or delete on public.comments
  for each row execute function private.log_portfolio_admin_update_delete();

revoke all on function public.is_portfolio_admin() from public, anon, authenticated;
drop function public.is_portfolio_admin();
