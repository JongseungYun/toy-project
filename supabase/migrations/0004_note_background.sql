-- 노트 배경
--
-- 노트마다 배경 색을 고르거나 이미지를 올려 쓴다. 설정의 기본 배경은 그 뒤에
-- 만드는 노트에만 적용되고, 이미 만든 노트는 그대로 둔다.
-- docs/decisions/note-safety.md: 올린 배경 이미지도 노트와 같은 규칙으로
-- 그 계정만 읽고 쓸 수 있다. 화면이 아니라 데이터베이스가 막는다.

-- 배경은 { kind: 'color', value } 또는 { kind: 'image', path } 한 가지다.
-- 한 컬럼에 담아 두면 나중에 다른 종류가 생겨도 마이그레이션이 필요 없다.
alter table public.notes
  add column if not exists background jsonb not null
  default '{"kind":"color","value":"#ffffff"}'::jsonb;

alter table public.profiles
  add column if not exists default_background jsonb not null
  default '{"kind":"color","value":"#ffffff"}'::jsonb;

-- 배경 이미지를 담을 비공개 버킷. 형식과 크기는 여기서도 막는다. 화면에서 거르는
-- 것만으로는 직접 올리는 요청을 막을 수 없다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-backgrounds',
  'note-backgrounds',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 파일은 항상 <사용자 id>/<파일 이름>에 놓는다. 첫 칸이 자기 id일 때만 쓰고
-- 읽을 수 있게 해서, 다른 사용자와 로그인하지 않은 사람은 닿지 못한다.
drop policy if exists "note_backgrounds_insert_own" on storage.objects;
create policy "note_backgrounds_insert_own" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'note-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "note_backgrounds_select_own" on storage.objects;
create policy "note_backgrounds_select_own" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'note-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 같은 이름으로 다시 올리는 경우(upsert)에는 update도 있어야 조용히 실패하지 않는다.
drop policy if exists "note_backgrounds_update_own" on storage.objects;
create policy "note_backgrounds_update_own" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'note-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'note-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "note_backgrounds_delete_own" on storage.objects;
create policy "note_backgrounds_delete_own" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'note-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
