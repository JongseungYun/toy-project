# 06 — 노트 배경을 내 것으로 바꾼다

## Outcome

사용자가 노트마다 배경 색을 고르거나 자기 이미지를 올려 배경으로 쓴다. 올린 이미지는 그 계정만 접근할 수 있다. 설정에서 기본 배경을 정해 두면 그 뒤에 만드는 노트가 그 배경으로 시작하고, 이미 만든 노트는 그대로 남는다. 배경을 바꿔도 본문 글자는 읽을 수 있다.

## Blockers

02 — 배경을 입힐 노트와 편집 화면이 거기서 생긴다.

## Acceptance criteria

- [ ] 노트마다 배경 색을 고를 수 있고, 다시 열었을 때 유지된다
- [ ] 노트 배경으로 이미지를 올려 쓸 수 있고, 다시 열었을 때 유지된다
- [ ] 올린 배경 이미지를 다른 사용자와 로그인하지 않은 사람이 가져갈 수 없다
- [ ] 허용하지 않는 형식이거나 크기를 넘는 파일은 올라가지 않고, 왜 안 되는지 알린다
- [ ] 설정에서 기본 배경을 정할 수 있다
- [ ] 기본 배경을 바꾼 뒤 만든 노트가 그 배경으로 시작하고, 이미 만든 노트는 바뀌지 않는다
- [ ] 어떤 배경을 골라도 본문 글자를 읽을 수 있다
- [ ] 세 형식 모두에서 배경이 동작한다

## Constraints

- 화면 구성은 승인된 프로토타입 `docs/specs/amu-note/prototype.html`의 `일반 문서` 화면에 있는 배경 고르기와 `설정` 화면의 기본 배경 영역이 정한다.
- 배경 이미지는 계정별로 보관하고 소유자만 접근할 수 있게 한다.
- 이미지 형식과 크기 제한은 스펙의 뒤집을 수 있는 가정을 따른다. 더 나은 근거가 나오면 바꿔도 되지만, 제한이 없는 상태로 두지는 않는다.
- 파일 보관은 설치된 `setup-supabase` 스킬의 범위 밖이다. `AGENTS.md`의 Supabase 컨텍스트가 가리키는 공식 출처를 작업 시점에 가져와 따른다.

## Verification

- Playwright로 노트 배경 색을 바꾼 뒤 새로고침했을 때 유지되는지 확인
- Playwright로 이미지를 올려 배경으로 적용한 뒤 새로고침했을 때 유지되는지 확인
- 다른 계정으로 로그인한 상태와 로그인하지 않은 상태에서 그 이미지에 접근할 수 없음을 확인
- 허용하지 않는 형식과 크기를 넘는 파일이 거부되고 이유가 보이는지 확인
- 기본 배경을 바꾼 뒤 만든 노트에만 적용되고 기존 노트는 그대로인지 확인
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
