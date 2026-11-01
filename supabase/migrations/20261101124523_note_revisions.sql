-- R06: 자동 저장과 같은 트랜잭션에서 복원 지점을 보관한다.
-- 최근 50개를 기간 제한 없이 유지한다. 실행 전 과거 이력은 재구성하지 않는다.
begin;

create schema if not exists amu_note_private;

create table if not exists public.note_revisions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('doc', 'markdown', 'canvas')),
  title text not null,
  content jsonb not null,
  preview text not null,
  version integer not null,
  kind text not null check (kind in ('initial', 'auto', 'restore')),
  saved_at timestamptz not null,
  -- 5분 묶음의 시작 시각. 묶음 안에서 내용을 갱신해도 바꾸지 않는다.
  created_at timestamptz not null default now(),
  unique (note_id, version)
);
create index if not exists note_revisions_note_time_idx
  on public.note_revisions(note_id, created_at desc, version desc);

alter table public.note_revisions enable row level security;
drop policy if exists note_revisions_select_own on public.note_revisions;
create policy note_revisions_select_own on public.note_revisions
  for select to authenticated using (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.notes n
      where n.id = note_id and n.owner_id = (select auth.uid()) and n.deleted_at is null
    )
  );
revoke all on public.note_revisions from public, anon, authenticated;
grant select on public.note_revisions to authenticated;

-- 일반 사용자는 이력 자체를 고칠 수 없다. 비공개 트리거만 OLD 행을 보관한다.
-- SECURITY DEFINER는 이 쓰기에만 필요하며, 함수는 공개 API에 노출하지 않는다.
create or replace function amu_note_private.capture_note_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  latest public.note_revisions;
  force_snapshot boolean := coalesce(current_setting('amu_note.force_revision', true), '') = old.id::text;
begin
  if old.deleted_at is not null then return new; end if;
  if not force_snapshot and old.title = new.title and old.content = new.content then return new; end if;

  select * into latest from public.note_revisions r where r.note_id = old.id
    order by r.created_at desc, r.version desc limit 1;

  if not force_snapshot and latest.kind = 'auto' and latest.created_at > now() - interval '5 minutes' then
    -- 미리 본 지점의 ID가 나중에 다른 내용을 가리키지 않도록 새 ID로 교체한다.
    delete from public.note_revisions where id = latest.id;
    insert into public.note_revisions(note_id, owner_id, format, title, content, preview, version, kind, saved_at, created_at)
      values (old.id, old.owner_id, old.format, old.title, old.content, old.preview, old.version,
        'auto', old.updated_at, latest.created_at);
  else
    insert into public.note_revisions(note_id, owner_id, format, title, content, preview, version, kind, saved_at)
      values (old.id, old.owner_id, old.format, old.title, old.content, old.preview, old.version,
        case when force_snapshot then 'restore' when latest.id is null then 'initial' else 'auto' end,
        old.updated_at);
  end if;

  delete from public.note_revisions where id in (
    select r.id from public.note_revisions r where r.note_id = old.id
      order by r.created_at desc, r.version desc offset 50
  );
  return new;
end;
$$;
revoke all on function amu_note_private.capture_note_revision() from public, anon, authenticated;
drop trigger if exists notes_capture_revision on public.notes;
create trigger notes_capture_revision before update on public.notes
  for each row execute function amu_note_private.capture_note_revision();

-- 같은 노트의 행 잠금과 기존 편집 버전으로 다른 기기의 수정을 덮지 않는다.
-- 호출자의 권한으로 실행하여 노트와 이력의 소유자 RLS를 그대로 거친다.
create or replace function public.restore_note_revision(target_note uuid, target_revision uuid, expected_version integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_note public.notes;
  chosen public.note_revisions;
begin
  select * into current_note from public.notes n
    where n.id = target_note and n.owner_id = (select auth.uid()) and n.deleted_at is null for update;
  if not found then return jsonb_build_object('status', 'missing'); end if;
  if current_note.version <> expected_version then
    return jsonb_build_object('status', 'conflict', 'latest', jsonb_build_object(
      'title', current_note.title, 'content', current_note.content,
      'version', current_note.version, 'updatedAt', current_note.updated_at));
  end if;

  select * into chosen from public.note_revisions r where r.id = target_revision and r.note_id = target_note;
  if not found or chosen.format <> current_note.format then return jsonb_build_object('status', 'missing'); end if;

  -- 같은 트랜잭션의 트리거가 복원 직전 상태를 독립된 지점으로 남기게 한다.
  perform set_config('amu_note.force_revision', target_note::text, true);
  update public.notes n set title = chosen.title, content = chosen.content,
    preview = chosen.preview, version = n.version + 1 where n.id = target_note returning * into current_note;
  perform set_config('amu_note.force_revision', '', true);
  return jsonb_build_object('status', 'restored', 'note', jsonb_build_object(
    'title', current_note.title, 'content', current_note.content,
    'version', current_note.version, 'updatedAt', current_note.updated_at));
end;
$$;
revoke all on function public.restore_note_revision(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.restore_note_revision(uuid, uuid, integer) to authenticated;

commit;
