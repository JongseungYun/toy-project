-- R08: 소유자의 전체 보관함을 읽고 원본을 건드리지 않는 복사본으로 복원한다.
begin;

create schema if not exists amu_note_private;
create table if not exists amu_note_private.backup_restores (
  id uuid primary key references public.folders(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload_hash text not null,
  result jsonb not null
);
alter table amu_note_private.backup_restores enable row level security;
revoke all on amu_note_private.backup_restores from public, anon, authenticated;

-- 휴지통 이력은 평소 SELECT 정책에서 숨긴다. 백업에 한해서 소유자 전체를
-- 읽어야 하므로 비공개 함수에서 호출자의 uid를 고정하고 읽는다.
create or replace function amu_note_private.create_note_backup()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'format', 'amu-note-backup', 'version', 1, 'created_at', now(),
    'folders', coalesce((select jsonb_agg(to_jsonb(f) order by f.id) from (
      select id, parent_id, name, created_at, updated_at, deleted_at, trash_root_id
      from public.folders where owner_id = (select auth.uid())
    ) f), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(to_jsonb(n) order by n.id) from (
      select id, folder_id, format, title, content, preview, version, is_pinned,
        background, created_at, updated_at, deleted_at, trash_root_id
      from public.notes where owner_id = (select auth.uid())
    ) n), '[]'::jsonb),
    'revisions', coalesce((select jsonb_agg(to_jsonb(r) order by r.note_id, r.version) from (
      select r.id, r.note_id, r.format, r.title, r.content, r.preview, r.version,
        r.kind, r.saved_at, r.created_at from public.note_revisions r
      join public.notes n on n.id = r.note_id
      where r.owner_id = (select auth.uid()) and n.owner_id = (select auth.uid())
    ) r), '[]'::jsonb)
  ) where (select auth.uid()) is not null;
$$;

-- 이력은 일반 클라이언트가 직접 쓸 수 없으므로 복원만 비공개 함수가 맡는다.
-- 소유자는 입력에서 받지 않으며, 모든 참조는 새로 만든 ID 안에서만 연결한다.
create or replace function amu_note_private.restore_note_backup(
  payload jsonb, restore_id uuid, folder_name text, check_only boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  digest text := md5(payload::text);
  receipt amu_note_private.backup_restores;
  folder_map jsonb;
  note_map jsonb;
  all_map jsonb;
  outcome jsonb;
begin
  if actor is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  -- 같은 요청의 재시도가 동시에 도착해도 복사본은 한 번만 만든다.
  perform pg_advisory_xact_lock(hashtextextended(actor::text || restore_id::text, 0));
  select * into receipt from amu_note_private.backup_restores r where r.id = restore_id and r.owner_id = actor;
  if found then
    if receipt.payload_hash <> digest then raise exception '다른 백업의 요청입니다.'; end if;
    return receipt.result;
  end if;
  if check_only then return null; end if;
  if payload->>'format' is distinct from 'amu-note-backup' or payload->>'version' is distinct from '1'
    or jsonb_typeof(payload->'folders') is distinct from 'array'
    or jsonb_typeof(payload->'notes') is distinct from 'array'
    or jsonb_typeof(payload->'revisions') is distinct from 'array' then
    raise exception '지원하지 않는 백업입니다.';
  end if;

  select coalesce(jsonb_object_agg(f->>'id', gen_random_uuid()::text), '{}') into folder_map
    from jsonb_array_elements(payload->'folders') f;
  select coalesce(jsonb_object_agg(n->>'id', gen_random_uuid()::text), '{}') into note_map
    from jsonb_array_elements(payload->'notes') n;
  all_map := folder_map || note_map;
  if exists (select 1 from jsonb_array_elements(payload->'folders') f
      where (f->>'parent_id' is not null and not folder_map ? (f->>'parent_id'))
        or (f->>'trash_root_id' is not null and not all_map ? (f->>'trash_root_id')))
    or exists (select 1 from jsonb_array_elements(payload->'notes') n
      where (n->>'folder_id' is not null and not folder_map ? (n->>'folder_id'))
        or (n->>'trash_root_id' is not null and not all_map ? (n->>'trash_root_id'))
        or (n->>'version')::integer < 1
        or (n->'background'->>'kind' = 'image' and
          left(n->'background'->>'path', length(actor::text) + 1) is distinct from actor::text || '/'))
    or exists (select 1 from jsonb_array_elements(payload->'revisions') r
      where not note_map ? (r->>'note_id')
        or not exists (select 1 from jsonb_array_elements(payload->'notes') n
          where n->>'id' = r->>'note_id' and n->>'format' = r->>'format'
            and (r->>'version')::integer >= 1 and (r->>'version')::integer < (n->>'version')::integer))
    or exists (select 1 from jsonb_array_elements(payload->'revisions') r
      group by r->>'note_id' having count(*) > 50) then
    raise exception '백업의 참조 또는 버전이 올바르지 않습니다.';
  end if;

  insert into public.folders(id, owner_id, name) values (restore_id, actor, folder_name);
  insert into public.folders(id, owner_id, parent_id, name, created_at, updated_at, deleted_at, trash_root_id)
    select (folder_map->>(f->>'id'))::uuid, actor,
      coalesce((folder_map->>(f->>'parent_id'))::uuid, restore_id), f->>'name',
      (f->>'created_at')::timestamptz, (f->>'updated_at')::timestamptz,
      (f->>'deleted_at')::timestamptz, (all_map->>(f->>'trash_root_id'))::uuid
    from jsonb_array_elements(payload->'folders') f;
  insert into public.notes(id, owner_id, folder_id, format, title, content, preview, version,
    is_pinned, background, created_at, updated_at, deleted_at, trash_root_id)
    select (note_map->>(n->>'id'))::uuid, actor,
      coalesce((folder_map->>(n->>'folder_id'))::uuid, restore_id), n->>'format', n->>'title',
      n->'content', n->>'preview', (n->>'version')::integer, (n->>'is_pinned')::boolean,
      n->'background', (n->>'created_at')::timestamptz, (n->>'updated_at')::timestamptz,
      (n->>'deleted_at')::timestamptz, (all_map->>(n->>'trash_root_id'))::uuid
    from jsonb_array_elements(payload->'notes') n;
  insert into public.note_revisions(note_id, owner_id, format, title, content, preview, version, kind, saved_at, created_at)
    select (note_map->>(r->>'note_id'))::uuid, actor, r->>'format', r->>'title', r->'content',
      r->>'preview', (r->>'version')::integer, r->>'kind',
      (r->>'saved_at')::timestamptz, (r->>'created_at')::timestamptz
    from jsonb_array_elements(payload->'revisions') r;

  outcome := jsonb_build_object('root_id', restore_id, 'name', folder_name);
  insert into amu_note_private.backup_restores(id, owner_id, payload_hash, result)
    values (restore_id, actor, digest, outcome);
  return outcome;
end;
$$;

-- 공개 RPC는 호출자 권한의 입구만 맡는다. 앱에 관리용 키를 두지 않는다.
create or replace function public.create_note_backup()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select amu_note_private.create_note_backup();
$$;
create or replace function public.restore_note_backup(
  payload jsonb, restore_id uuid, folder_name text, check_only boolean default false
) returns jsonb language sql security invoker set search_path = '' as $$
  select amu_note_private.restore_note_backup(payload, restore_id, folder_name, check_only);
$$;

revoke all on function amu_note_private.create_note_backup() from public, anon, authenticated;
revoke all on function amu_note_private.restore_note_backup(jsonb, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.create_note_backup() from public, anon, authenticated;
revoke all on function public.restore_note_backup(jsonb, uuid, text, boolean) from public, anon, authenticated;
grant usage on schema amu_note_private to authenticated;
grant execute on function amu_note_private.create_note_backup() to authenticated;
grant execute on function amu_note_private.restore_note_backup(jsonb, uuid, text, boolean) to authenticated;
grant execute on function public.create_note_backup() to authenticated;
grant execute on function public.restore_note_backup(jsonb, uuid, text, boolean) to authenticated;
commit;
