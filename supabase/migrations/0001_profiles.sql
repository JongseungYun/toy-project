-- 아무노트 태스크 01: 계정 프로필과 아이디 중복 확인
--
-- docs/decisions/account-identity.md: 아이디는 공개 식별자이자 유일 값이며,
-- Supabase Auth에는 내부 전용 이메일로 등록한다. 이 테이블은 아이디를 조회 가능한
-- 형태로 보관해 중복 확인과 화면 표시에 쓴다.

-- username은 자체 계정(아이디·비밀번호)에서만 채워진다. Google 등 외부 로그인은
-- account-identity.md의 범위 밖이라 공급자가 준 식별자를 그대로 쓰고, 이 컬럼은
-- null로 남는다. unique 제약은 null끼리는 충돌하지 않으므로 그대로 둔다.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 본인 행만 읽고 쓸 수 있다. 다른 사용자와 로그인하지 않은 사람은 접근할 수 없다.
create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 가입 시 auth.users에 맞춰 프로필 행을 만든다. raw_user_meta_data의 username은
-- 회원가입 Server Action(lib/account/actions.ts)이 signUp options.data로 넣는다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 아이디 중복 확인은 로그인 전(가입 화면)에도 동작해야 하므로 anon 역할까지
-- 허용하는 좁은 RPC로 노출한다. 존재 여부만 반환하고 다른 정보는 주지 않는다.
create or replace function public.is_username_available(check_username text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.profiles where username = check_username
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
