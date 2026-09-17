# 04 — 그림판 노트를 그리고 이어 그린다

## Outcome

새 노트를 만들 때 그림판을 고를 수 있다. 자유 선을 긋고, 사각형·원·선·화살표를 그리고, 글상자로 글자를 넣는다. 그린 것은 요소 단위로 남아서 되돌리기가 요소 하나씩 동작하고, 나중에 다시 열어 이어 그릴 수 있다. 목록에서는 그림을 줄인 미리보기로 보인다.

## Blockers

02 — 형식 선택 창, 자동 저장, 목록이 거기서 생긴다.

## Acceptance criteria

- [ ] 형식 선택 창에 그림판이 나오고, 고르면 그림판 노트가 만들어진다
- [ ] 자유 선을 그릴 수 있고 색과 굵기를 고를 수 있다
- [ ] 그린 것을 지울 수 있다
- [ ] 사각형, 원, 선, 화살표를 그릴 수 있다
- [ ] 글상자로 글자를 넣을 수 있다
- [ ] 되돌리기가 요소 하나씩 동작한다
- [ ] 노트를 다시 열면 그린 것이 그대로 있고 이어 그릴 수 있다
- [ ] 그림판 노트도 02와 같은 규칙으로 자동 저장되고 충돌을 알린다
- [ ] 목록에서 그림판 노트가 그림을 줄인 미리보기로 보인다

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
pending

## Execution

<!-- Append concise evidence and preserve earlier entries when status changes.
Execution Blocker is the current impediment for an active task, not a declared
task dependency. In a superseded task, preserved entries are historical. -->
- Verification: —
- Blocker: —
- Revision: —
