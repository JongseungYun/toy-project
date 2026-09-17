-- 노트 저장소와 소유자 전용 접근, 충돌 감지용 버전
--
-- docs/decisions/note-formats.md: 노트는 하나의 형식을 가지고, 그 형식은 만든
-- 뒤에 바꾸지 않는다.
-- docs/decisions/note-safety.md: 소유자 격리는 데이터베이스가 건다. 다른 기기가
-- 먼저 바꿔 둔 경우를 조용히 덮지 않으려고 version으로 낙관적 잠금을 건다.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- 형식은 만든 뒤에 바꾸지 않는다. 03(markdown)과 04(canvas)가 같은 컬럼을 쓴다.
  format text not null check (format in ('doc', 'markdown', 'canvas')),
  -- 사용자가 직접 입력한 제목. 비어 있을 수 있고, 그때 화면은 본문 첫 줄이나
  -- 형식별 기본 이름을 대신 쓴다(lib/notes/display.ts).
  title text not null default '',
  -- 목록 미리보기용으로 뽑아 둔 본문 발췌. 목록이 본문 전체를 읽지 않게 한다.
  preview text not null default '',
  -- 형식마다 모양이 다르다: doc은 { html }, markdown은 { source, viewer },
  -- canvas는 { elements }. 형식이 늘어도 마이그레이션이 필요 없다.
  content jsonb not null default '{}'::jsonb,
  -- 저장할 때마다 1씩 오른다. 내가 불러온 값과 다르면 충돌이다.
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 목록은 항상 한 사용자의 노트를 정해진 기준으로 정렬해 읽는다.
-- 정렬 기준 세 가지를 각각 owner_id와 묶어 복합 인덱스로 둔다.
create index if not exists notes_owner_updated_idx
  on public.notes (owner_id, updated_at desc);
create index if not exists notes_owner_created_idx
  on public.notes (owner_id, created_at desc);
create index if not exists notes_owner_title_idx
  on public.notes (owner_id, title);

alter table public.notes enable row level security;

-- 본인 노트만 읽고 쓴다. auth.uid()를 select로 감싸 행마다 다시 부르지 않게 한다.
drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- 마지막 수정 시점은 클라이언트 시계가 아니라 데이터베이스가 정한다.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute procedure public.touch_updated_at();
