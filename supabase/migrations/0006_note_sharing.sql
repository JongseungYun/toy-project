-- 읽기 전용 공유 링크
--
-- docs/decisions/note-sharing.md: 공유는 링크를 가진 사람에게 읽기만 열어 준다.
-- 노트마다 열쇠(share_token)를 하나 두고, 그 열쇠를 아는 요청에만 내용을 내준다.
-- 공유를 끄면 열쇠를 지운다. 다시 켜면 새 열쇠라 이전 링크는 열리지 않는다.

alter table public.notes
  add column if not exists share_token uuid,
  add column if not exists shared_at timestamptz;

-- 열쇠는 노트 하나를 가리켜야 한다. 공유하지 않는 노트가 대부분이라 부분 인덱스로 둔다.
create unique index if not exists notes_share_token_key
  on public.notes (share_token)
  where share_token is not null;

-- 링크를 여는 사람은 로그인하지 않았다. notes의 select 정책은 소유자만 통과하므로
-- 그대로 두고, 열쇠 하나로 노트 하나만 꺼내는 함수를 따로 연다.
--
-- security definer인 이유는 이 함수가 RLS를 넘어 읽어야 하기 때문이다. 대신
-- 넘겨받은 열쇠와 정확히 맞는 행 하나로 범위를 스스로 좁힌다. notes에 anon select
-- 정책을 여는 방식은 "공유 중인 노트 전체 목록"을 누구나 훑을 수 있게 만든다.
create or replace function public.shared_note(token uuid)
returns table (
  id uuid,
  format text,
  title text,
  preview text,
  content jsonb,
  background jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.format, n.title, n.preview, n.content, n.background, n.updated_at
  from public.notes n
  where n.share_token = token
    and n.shared_at is not null
    -- 휴지통에 들어간 노트는 링크가 남아 있어도 열리지 않는다.
    and n.deleted_at is null
  limit 1;
$$;

-- 함수는 기본으로 모두에게 실행 권한이 붙는다. 의도를 분명히 하려고 한 번 걷고
-- 링크를 여는 두 역할에만 다시 준다.
revoke all on function public.shared_note(uuid) from public;
grant execute on function public.shared_note(uuid) to anon, authenticated;
