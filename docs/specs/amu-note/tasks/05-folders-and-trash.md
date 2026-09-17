# 05 — 폴더로 정리하고 지운 것을 되돌린다

## Outcome

사용자가 폴더를 만들어 노트를 담고, 폴더 안에 폴더를 두어 깊이 제한 없이 정리한다. 좌측 패널은 지금 열려 있는 폴더의 내용만 보여주고, 상단 경로로 상위에 돌아간다. 노트나 폴더를 지우면 휴지통으로 가고, 폴더를 지우면 그 안의 하위 폴더와 노트가 함께 간다. 휴지통에서 되돌리면 원래 자리로 돌아가고, 영구 삭제는 확인을 받은 뒤에만 이루어진다.

## Blockers

02 — 정리할 노트와 그것을 보여주는 목록이 거기서 생긴다.

## Acceptance criteria

- [x] 폴더를 만들 수 있고 폴더 안에 폴더를 둘 수 있다
- [x] 좌측 패널이 지금 열려 있는 폴더의 내용만 보여준다
- [x] 폴더도 노트와 같은 목록 항목으로 나오고, 누르면 그 안으로 들어간다
- [x] 상단 경로에서 상위 폴더로 돌아갈 수 있다
- [x] 노트를 폴더에 넣고 다른 폴더로 옮길 수 있다
- [x] 정렬 기준과 뒤집기가 폴더 안에서도 동작한다
- [x] 노트를 지우면 휴지통으로 간다
- [x] 폴더를 지우면 그 안의 하위 폴더와 노트가 함께 휴지통으로 간다
- [x] 휴지통에서 되돌리면 원래 있던 자리로 돌아간다
- [x] 영구 삭제는 사용자에게 확인받은 뒤에만 이루어지고, 그 뒤에는 되돌릴 수 없다
- [x] 휴지통에 있는 노트와 폴더는 보관함 목록에 나오지 않는다
- [x] 휴지통이 비었을 때 그 사실을 알린다

## Constraints

- 화면 구성과 상태 표현은 승인된 프로토타입 `docs/specs/amu-note/prototype.html`의 `보관함`(폴더 안)과 `휴지통`(기본, 비어 있음) 화면이 정한다.
- 되돌릴 수 없는 삭제를 기본 동작으로 두지 않는다. 모든 삭제는 휴지통을 거친다.
- 휴지통을 자동으로 비우는 보관 기간은 두지 않는다. 사용자가 비우기 전까지 그대로 쌓인다.

## Verification

- Playwright로 폴더 만들기 → 들어가기 → 경로로 상위 복귀까지 한 흐름으로 통과
- Playwright로 노트를 폴더에 넣고 다른 폴더로 옮긴 뒤, 옮긴 자리에서 보이는지 확인
- Playwright로 하위 폴더와 노트를 가진 폴더를 지웠을 때 하위가 함께 휴지통에 들어가고, 되돌리면 원래 구조로 복원되는지 확인
- 휴지통에 있는 항목이 보관함 목록에 나오지 않는지 확인
- `bun run test`, `bun run typecheck`, `bun run lint` 통과

## Review checkpoint

None.

## Status

<!-- Current values: `pending`, `in-progress`, `completed`, `blocked`, or
`superseded`.
`completed` is valid only while all acceptance criteria and focused
verification pass. Use `superseded` only after an approved replacement of a
task with recorded completion history. Preserve its Execution evidence and name
the replacement and reason under Revision; it is then terminal for that approved
breakdown and outside the current delivery map. -->
completed

## Execution

<!-- Append concise evidence and preserve earlier entries when status changes.
Execution Blocker is the current impediment for an active task, not a declared
task dependency. In a superseded task, preserved entries are historical. -->
- Verification: `supabase/migrations/0003_folders_and_trash.sql`를 사용자가 SQL Editor에서 적용(folders 테이블, notes의 folder_id·deleted_at·trash_root_id, 소유자 전용 RLS 4종, 활성/휴지통용 부분 인덱스, 재귀로 하위를 훑는 trash_folder 함수). `bun run typecheck`·`eslint app lib components e2e`·`bun run test` 통과. Playwright e2e 26개 전부 통과(`e2e/folders.spec.ts` 8개 신규: 폴더 만들기·중첩·경로로 상위 복귀, 열린 폴더의 내용만 보여주기, 노트를 폴더에 넣고 다른 폴더로 옮기기, 폴더를 지우면 하위가 함께 휴지통으로 가고 되돌리면 원래 구조 복원, 노트 휴지통 보내기와 되돌리기, 영구 삭제의 확인과 취소, 빈 휴지통 안내, 폴더 안에서의 정렬과 뒤집기). 실행 중인 앱에서 직접 확인: 폴더 만들기와 목록 표시, 폴더 안 경로와 빈 폴더 안내, 폴더 안에서 만든 노트가 그 폴더에만 보이는 것, 폴더를 휴지통으로 보낼 때의 확인 창, 휴지통의 "폴더 · 1개 함께 들어옴" 표시, 되돌린 뒤 폴더와 그 안의 노트가 함께 돌아오는 것.
- Blocker: —
- Revision: 프로토타입에 폴더를 만드는 control과 지우는 control, 노트를 옮기는 control이 없다. 경로 줄 오른쪽에 "새 폴더"를 두고, 폴더 안에 있을 때만 "이 폴더를 휴지통으로"가 함께 나오게 했다. 노트 옮기기는 프로토타입이 정한 머리말 휴지통 버튼 옆에 붙였다. 휴지통 행은 좁은 폭에서 글자 칸이 눌려, 충돌 배너와 같은 방식(min-width + 줄바꿈)으로 버튼이 아래로 내려가게 했다. 휴지통에 들어간 노트는 주소로도 열리지 않게 `getNote`에서 제외했다. 되돌리기는 휴지통 화면에서 한다. 폴더 정렬은 "수정일"이 노트와 같은 뜻이 아니어서 제목 기준일 때만 이름순, 그 밖에는 만든 순으로 두고 방향만 사용자의 선택을 따른다. 06~07에 대한 태스크 경계·순서·수용 기준 변경은 없다.
- Review: 이 태스크는 `Review checkpoint: None`이고 `AGENTS.md`의 검증·리뷰 예산이 자동 리뷰를 최대 1회로 제한하므로, 02에서 쓴 한 번으로 갈음하고 따로 돌리지 않았다.
- Note: Supabase 무료 플랜의 가입 속도 제한 때문에 e2e를 높은 병렬도로 돌리면 가입이 막혀 실패한다. `--workers=2`로 전체 26개가 통과한다.
