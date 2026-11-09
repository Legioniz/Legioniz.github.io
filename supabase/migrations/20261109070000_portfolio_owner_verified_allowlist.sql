-- Restrict owner auto-allowlisting to the exact confirmed email address.
create or replace function private.allowlist_portfolio_owner_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
     and lower(coalesce(new.email, '')) = 'kingartriez@gmail.com' then
    insert into public.admin_users (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.allowlist_portfolio_owner_email() from public, anon, authenticated;
drop trigger if exists portfolio_owner_allowlist_after_insert on auth.users;
drop trigger if exists portfolio_owner_allowlist_after_verification on auth.users;
create trigger portfolio_owner_allowlist_after_verification
  after insert or update on auth.users
  for each row execute function private.allowlist_portfolio_owner_email();

insert into public.admin_users (user_id)
select id from auth.users
where lower(email) = 'kingartriez@gmail.com' and email_confirmed_at is not null
on conflict (user_id) do nothing;
