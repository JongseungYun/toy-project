-- R05: 고정 여부는 노트의 계정별 정리 정보다. 기존 소유자 RLS를 그대로 적용한다.
-- 본문·형식·삭제 상태·충돌 감지 버전은 바꾸지 않는다.
alter table public.notes
  add column if not exists is_pinned boolean not null default false;
