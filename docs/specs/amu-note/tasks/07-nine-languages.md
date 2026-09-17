# 07 — 아홉 개 언어로 쓴다

## Outcome

처음 들어온 사람은 브라우저 언어로 앱을 만난다. 지원하지 않는 언어면 영어로 시작한다. 설정에서 아홉 개 언어 중 하나를 고르면 계정에 저장되어 다른 기기에서 열어도 그 언어로 나온다. 노트 내용은 사용자의 것이므로 언어 설정과 무관하게 그대로 있다. 설정에서 앱 정보도 볼 수 있다.

## Blockers

01 — 언어 설정을 계정에 저장하려면 계정이 있어야 하고, 설정 화면은 로그인한 뒤에 열린다.

## Acceptance criteria

- [ ] 표시 언어를 영어, 프랑스어, 독일어, 이탈리아어, 스페인어, 중국어 간체, 중국어 번체, 일본어, 한국어 중에서 고를 수 있다
- [ ] 처음 들어온 사람은 브라우저 언어를 따른다
- [ ] 브라우저 언어가 지원 목록에 없으면 영어로 시작한다
- [ ] 설정에서 언어를 바꾸면 계정에 저장되어 다른 기기에서 열어도 그 언어로 나온다
- [ ] 노트 제목과 본문은 언어 설정과 무관하게 그대로 남는다
- [ ] 아홉 개 언어 모두에서 화면 문구가 잘리거나 넘치지 않는다
- [ ] 설정에서 앱 정보를 볼 수 있다
- [ ] 로그아웃이 이 기기에서만 나가고 다른 기기의 로그인은 건드리지 않는다

## Constraints

- 화면 구성은 승인된 프로토타입 `docs/specs/amu-note/prototype.html`의 `설정` 화면에 있는 계정, 언어, 앱 정보 영역이 정한다.
- 번역 대상은 UI 문구뿐이다. 노트 내용은 건드리지 않는다.
- 문구 길이는 언어마다 다르다. 독일어처럼 길어지는 언어에서 레이아웃이 깨지지 않는지 확인한다.

## Verification

- Playwright로 브라우저 언어를 바꿔 접속했을 때 그 언어로 시작하는지, 지원하지 않는 언어면 영어로 시작하는지 확인
- Playwright로 설정에서 언어를 바꾼 뒤 다른 세션으로 로그인했을 때 그 언어가 유지되는지 확인
- 언어를 바꾼 뒤 노트 제목과 본문이 그대로인지 확인
- 가장 긴 문구가 나오는 언어에서 로그인, 보관함, 편집, 설정 화면의 문구가 잘리거나 넘치지 않는지 확인
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
