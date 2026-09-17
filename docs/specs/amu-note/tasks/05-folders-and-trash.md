# 05 — 폴더로 정리하고 지운 것을 되돌린다

## Outcome

사용자가 폴더를 만들어 노트를 담고, 폴더 안에 폴더를 두어 깊이 제한 없이 정리한다. 좌측 패널은 지금 열려 있는 폴더의 내용만 보여주고, 상단 경로로 상위에 돌아간다. 노트나 폴더를 지우면 휴지통으로 가고, 폴더를 지우면 그 안의 하위 폴더와 노트가 함께 간다. 휴지통에서 되돌리면 원래 자리로 돌아가고, 영구 삭제는 확인을 받은 뒤에만 이루어진다.

## Blockers

02 — 정리할 노트와 그것을 보여주는 목록이 거기서 생긴다.

## Acceptance criteria

- [ ] 폴더를 만들 수 있고 폴더 안에 폴더를 둘 수 있다
- [ ] 좌측 패널이 지금 열려 있는 폴더의 내용만 보여준다
- [ ] 폴더도 노트와 같은 목록 항목으로 나오고, 누르면 그 안으로 들어간다
- [ ] 상단 경로에서 상위 폴더로 돌아갈 수 있다
- [ ] 노트를 폴더에 넣고 다른 폴더로 옮길 수 있다
- [ ] 정렬 기준과 뒤집기가 폴더 안에서도 동작한다
- [ ] 노트를 지우면 휴지통으로 간다
- [ ] 폴더를 지우면 그 안의 하위 폴더와 노트가 함께 휴지통으로 간다
- [ ] 휴지통에서 되돌리면 원래 있던 자리로 돌아간다
- [ ] 영구 삭제는 사용자에게 확인받은 뒤에만 이루어지고, 그 뒤에는 되돌릴 수 없다
- [ ] 휴지통에 있는 노트와 폴더는 보관함 목록에 나오지 않는다
- [ ] 휴지통이 비었을 때 그 사실을 알린다

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
pending

## Execution

<!-- Append concise evidence and preserve earlier entries when status changes.
Execution Blocker is the current impediment for an active task, not a declared
task dependency. In a superseded task, preserved entries are historical. -->
- Verification: —
- Blocker: —
- Revision: —
