-- 폴더와 휴지통
--
-- docs/decisions/note-safety.md: 모든 삭제는 휴지통을 거친다. 폴더를 지우면 그
-- 안의 하위 폴더와 노트가 함께 들어가고, 되돌리면 원래 자리로 돌아간다.
-- 폴더는 깊이 제한 없이 중첩된다.

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- null이면 보관함 뿌리에 있다. 폴더가 지워지면 그 안도 함께 사라진다.
  parent_id uuid references public.folders (id) on delete cascade,
  name text not null default '새 폴더',
  -- 휴지통에 들어간 시각. null이면 보관함에 있다.
  deleted_at timestamptz,
  -- 사용자가 직접 지운 항목의 id. 폴더를 지우면 그 안의 것들도 같은 값을 갖는다.
  -- 휴지통 목록은 trash_root_id = id인 행만 보여주고, 되돌리기와 영구 삭제는
  -- 같은 값을 가진 행 전체에 한 번에 적용된다.
  trash_root_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes
  add column if not exists folder_id uuid references public.folders (id) on delete cascade,
  add column if not exists deleted_at timestamptz,
  add column if not exists trash_root_id uuid;

-- 목록은 "지금 열려 있는 폴더의, 지우지 않은 것"만 읽는다.
create index if not exists folders_owner_parent_idx
  on public.folders (owner_id, parent_id) where deleted_at is null;
create index if not exists notes_owner_folder_idx
  on public.notes (owner_id, folder_id) where deleted_at is null;

-- 휴지통은 반대로 지운 것만 읽는다.
create index if not exists folders_owner_trash_idx
  on public.folders (owner_id, trash_root_id) where deleted_at is not null;
create index if not exists notes_owner_trash_idx
  on public.notes (owner_id, trash_root_id) where deleted_at is not null;

alter table public.folders enable row level security;

drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own" on public.folders
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own" on public.folders
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own" on public.folders
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own" on public.folders
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

drop trigger if exists folders_touch_updated_at on public.folders;
create trigger folders_touch_updated_at
  before update on public.folders
  for each row execute procedure public.touch_updated_at();

-- 폴더 하나를 지우면 그 아래 전부가 함께 휴지통으로 간다. 깊이 제한이 없으므로
-- 재귀로 훑는다. security invoker(기본)이라 RLS가 그대로 걸리고, 남의 행은
-- 애초에 보이지 않아 건드릴 수 없다.
create or replace function public.trash_folder(target uuid)
returns void
language sql
set search_path = ''
as $$
  with recursive subtree as (
    select f.id
    from public.folders f
    where f.id = target and f.deleted_at is null
    union all
    select child.id
    from public.folders child
    join subtree parent on child.parent_id = parent.id
    where child.deleted_at is null
  ),
  marked as (
    update public.folders
    set deleted_at = now(), trash_root_id = target
    where id in (select id from subtree)
    returning id
  )
  update public.notes
  set deleted_at = now(), trash_root_id = target
  where folder_id in (select id from marked) and deleted_at is null;
$$;

grant execute on function public.trash_folder(uuid) to authenticated;
