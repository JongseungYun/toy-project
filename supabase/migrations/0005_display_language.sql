-- 표시 언어
--
-- 설정에서 고른 언어는 계정에 저장되어 다른 기기에서 열어도 그대로다. null이면
-- 아직 고르지 않았다는 뜻이고, 그때는 브라우저 언어를 따른다.
-- docs/decisions/note-formats.md: 표시 언어를 따르는 것은 화면 문구뿐이다.
-- 노트 제목과 본문은 그대로 둔다.

alter table public.profiles
  add column if not exists locale text;
