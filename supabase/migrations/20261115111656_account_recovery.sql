begin;

-- 복구 주소와 토큰 해시는 서버 전용이다. 사용자 세션으로는 읽거나 쓸 수 없다.
create table if not exists public.account_recovery (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_email text not null unique,
  verified_email text,
  pending_email text,
  verification_digest text unique,
  verification_expires_at timestamptz,
  verification_sent_at timestamptz,
  reset_digest text unique,
  reset_expires_at timestamptz,
  reset_sent_at timestamptz
);

alter table public.account_recovery enable row level security;
revoke all on table public.account_recovery from public, anon, authenticated, service_role;
grant select, insert, update on table public.account_recovery to service_role;

create or replace function public.begin_recovery_email(account_id uuid, internal_email text, address text, digest text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.account_recovery as r
    (user_id, login_email, pending_email, verification_digest, verification_expires_at, verification_sent_at)
  values (account_id, internal_email, address, digest, now() + interval '30 minutes', now())
  on conflict (user_id) do update set
    pending_email = excluded.pending_email,
    verification_digest = excluded.verification_digest,
    verification_expires_at = excluded.verification_expires_at,
    verification_sent_at = excluded.verification_sent_at
  where r.verification_sent_at is null or r.verification_sent_at <= now() - interval '1 minute';
  return found;
end;
$$;

create or replace function public.confirm_recovery_email(digest text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.account_recovery r set verified_email = r.pending_email,
    pending_email = null, verification_digest = null, verification_expires_at = null,
    reset_digest = null, reset_expires_at = null, reset_sent_at = null
  where r.verification_digest = digest and r.verification_expires_at > now() and r.pending_email is not null;
  return found;
end;
$$;

create or replace function public.begin_password_recovery(internal_email text, digest text)
returns text language sql security invoker set search_path = '' as $$
  update public.account_recovery r set
    reset_digest = digest, reset_expires_at = now() + interval '30 minutes', reset_sent_at = now()
  where r.login_email = internal_email and r.verified_email is not null
    and (r.reset_sent_at is null or r.reset_sent_at <= now() - interval '1 minute')
  returning r.verified_email;
$$;

create or replace function public.consume_password_recovery(digest text)
returns uuid language sql security invoker set search_path = '' as $$
  update public.account_recovery r set reset_digest = null, reset_expires_at = null
  where r.reset_digest = digest and r.reset_expires_at > now() and r.verified_email is not null
  returning r.user_id;
$$;

revoke all on function public.begin_recovery_email(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.confirm_recovery_email(text) from public, anon, authenticated;
revoke all on function public.begin_password_recovery(text, text) from public, anon, authenticated;
revoke all on function public.consume_password_recovery(text) from public, anon, authenticated;
grant execute on function public.begin_recovery_email(uuid, text, text, text) to service_role;
grant execute on function public.confirm_recovery_email(text) to service_role;
grant execute on function public.begin_password_recovery(text, text) to service_role;
grant execute on function public.consume_password_recovery(text) to service_role;

commit;
