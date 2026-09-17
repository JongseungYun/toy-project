# 03 — Markdown 노트를 쓰고 결과를 옆에서 확인한다

## Outcome

새 노트를 만들 때 Markdown을 고를 수 있다. 원문을 쓰는 동안 뷰어를 켜면 오른쪽에 결과가 나오고, 끄면 편집 영역이 전체 폭을 쓴다. 켜고 끈 상태는 그 노트에 기억되어 다시 열었을 때 그대로다. 저장과 목록 동작은 다른 형식과 같다.

## Blockers

02 — 형식 선택 창, 자동 저장, 목록이 거기서 생긴다.

## Acceptance criteria

- [ ] 형식 선택 창에 Markdown이 나오고, 고르면 Markdown 노트가 만들어진다
- [ ] Markdown 원문을 직접 입력할 수 있다
- [ ] 뷰어를 켜면 편집 영역 오른쪽에 결과가 나온다
- [ ] 뷰어를 끄면 편집 영역이 전체 폭을 쓴다
- [ ] 뷰어가 제목, 목록, 강조, 코드, 인용, 표, 링크를 결과로 보여준다
- [ ] 뷰어를 켜고 끈 상태가 그 노트에 기억되어 다시 열었을 때 유지된다
- [ ] Markdown 노트도 02와 같은 규칙으로 자동 저장되고 충돌을 알린다
- [ ] 목록에서 Markdown 노트가 형식과 내용 미리보기와 함께 보인다

## Constraints

- 화면 구성과 상태 표현은 승인된 프로토타입 `docs/specs/amu-note/prototype.html`의 `Markdown 문서`(기본, 뷰어 숨김) 화면이 정한다.
- 좁은 화면에서 원문과 뷰어를 어떻게 쌓는지도 같은 화면이 정한다.

## Verification

- Playwright로 Markdown 노트 만들기 → 제목·목록·강조·코드·인용·표를 포함한 원문 입력 → 뷰어에 각각이 결과로 나타남을 확인
- Playwright로 뷰어를 끈 뒤 노트를 다시 열었을 때 꺼진 상태가 유지되는지 확인
- Playwright로 원문을 고친 뒤 새로고침했을 때 내용이 유지되는지 확인
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
