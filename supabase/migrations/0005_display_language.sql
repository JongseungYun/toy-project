-- 아무노트 태스크 07: 표시 언어
--
-- docs/specs/amu-note/spec.md: 설정에서 고른 언어는 계정에 저장되어 다른
-- 기기에서 열어도 그대로다. null이면 아직 고르지 않았다는 뜻이고, 그때는
-- 브라우저 언어를 따른다.

alter table public.profiles
  add column if not exists locale text;
