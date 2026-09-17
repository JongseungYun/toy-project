# 04 — 그림판 노트를 그리고 이어 그린다

## Outcome

새 노트를 만들 때 그림판을 고를 수 있다. 자유 선을 긋고, 사각형·원·선·화살표를 그리고, 글상자로 글자를 넣는다. 그린 것은 요소 단위로 남아서 되돌리기가 요소 하나씩 동작하고, 나중에 다시 열어 이어 그릴 수 있다. 목록에서는 그림을 줄인 미리보기로 보인다.

## Blockers

02 — 형식 선택 창, 자동 저장, 목록이 거기서 생긴다.

## Acceptance criteria

- [x] 형식 선택 창에 그림판이 나오고, 고르면 그림판 노트가 만들어진다
- [x] 자유 선을 그릴 수 있고 색과 굵기를 고를 수 있다
- [x] 그린 것을 지울 수 있다
- [x] 사각형, 원, 선, 화살표를 그릴 수 있다
- [x] 글상자로 글자를 넣을 수 있다
- [x] 되돌리기가 요소 하나씩 동작한다
- [x] 노트를 다시 열면 그린 것이 그대로 있고 이어 그릴 수 있다
- [x] 그림판 노트도 02와 같은 규칙으로 자동 저장되고 충돌을 알린다
- [x] 목록에서 그림판 노트가 그림을 줄인 미리보기로 보인다

## Constraints

- 화면 구성과 도구 배치는 승인된 프로토타입 `docs/specs/amu-note/prototype.html`의 `그림판` 화면이 정한다.
- 그림은 요소 단위로 보관한다. 그림 한 장을 이미지로만 남기면 이어 그리기와 요소 단위 되돌리기가 성립하지 않는다.
- 무한 캔버스와 확대·축소는 범위 밖이다. 노트 한 장에 해당하는 고정 크기 그림면으로 둔다.

## Verification

- Playwright로 그림판 노트 만들기 → 자유 선, 도형, 글상자를 각각 추가 → 새로고침 후 모두 남아 있음을 확인
- Playwright로 요소를 여러 개 추가한 뒤 되돌리기를 눌렀을 때 마지막 요소 하나만 사라지는지 확인
- 목록에서 그림판 노트의 미리보기가 빈 칸이 아니라 그린 내용으로 나오는지 확인
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
- Verification: `bun run typecheck`·`eslint app lib components e2e`·`bun run test`(36개) 통과. Playwright e2e 18개 전부 통과(`e2e/canvas.spec.ts` 4개 신규: 자유 선·사각형·원·선·화살표·글상자를 각각 넣고 새로고침 후에도 여섯 요소가 남는 것과 이어 그리기, 되돌리기가 마지막 하나씩만 지우는 것, 지우개가 고른 요소만 지우는 것, 목록 미리보기가 실제 도형을 담는 것). 태스크 02·03의 e2e 14개도 함께 재실행해 회귀가 없음을 확인했다. 실행 중인 앱에서 직접 확인: 형식 선택 창의 그림판, 자유 선·사각형·화살표·글상자 그리기, 되돌리기 한 번에 요소 하나만 사라지는 것, 지우개로 사각형만 지우는 것, 목록 썸네일이 그림을 줄여 보여주는 것, 제목을 비운 그림판의 이름이 그림에 적힌 글을 따라가는 것, 그리고 두 탭으로 만든 실제 충돌 배너와 양쪽 그림 보존.
- Blocker: —
- Revision: 그림은 `content.elements`에 요소 목록으로 담고, 목록 미리보기는 그 요소를 그대로 `preview`에 실어 같은 renderer(`components/notes/canvas-figure.tsx`)로 작게 다시 그린다. 그림판의 미리보기는 글이 아니므로 제목 자리에는 그림에 적힌 첫 글만 쓰고, 없으면 기본 이름을 쓴다(저장된 값이 제목에 새지 않게 한다). 글상자는 누른 뒤 뗄 때 열어야 한다. 누르는 순간 열면 뒤따라오는 click이 갓 열린 입력칸의 포커스를 도로 가져가 곧장 닫혔다. 지우개는 같은 모양을 투명한 굵은 획으로 한 번 더 깔아 집는다. 저장 표시에 `data-saved-count`를 달아, 이미 "저장됨"이던 상태를 저장 완료로 잘못 읽지 않도록 테스트가 기다릴 수 있게 했다(03의 뷰어 토글 대기도 같은 신호로 바꿨다). 05~07에 대한 태스크 경계·순서·수용 기준 변경은 없다.
- Review: 이 태스크는 `Review checkpoint: None`이고 `AGENTS.md`의 검증·리뷰 예산이 자동 리뷰를 최대 1회로 제한하므로, 02에서 쓴 한 번으로 갈음하고 따로 돌리지 않았다.
