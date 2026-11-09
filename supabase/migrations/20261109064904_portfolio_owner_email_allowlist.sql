-- Initial owner email allowlist bootstrap.
-- Superseded by the verified-email-only trigger in the following migration.

create or replace function private.allowlist_portfolio_owner_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) = 'kingartriez@gmail.com' then
    insert into public.admin_users (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.allowlist_portfolio_owner_email() from public, anon, authenticated;
drop trigger if exists portfolio_owner_allowlist_after_insert on auth.users;
create trigger portfolio_owner_allowlist_after_insert
  after insert on auth.users
  for each row execute function private.allowlist_portfolio_owner_email();
