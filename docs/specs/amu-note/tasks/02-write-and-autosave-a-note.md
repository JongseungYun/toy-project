# 02 — 노트를 만들어 쓰면 알아서 저장되고 목록에서 다시 연다

## Outcome

사용자가 보관함에서 새 노트를 만들면 형식을 고르는 창이 뜨고, 고른 형식의 빈 노트가 바로 열린다. 글을 쓰고 서식을 입히는 동안 저장은 알아서 되고, 지금 저장 중인지 저장됐는지가 화면에 보인다. 다른 기기에서 같은 노트를 먼저 바꿔 두었으면 조용히 덮지 않고 알려서 어느 쪽을 남길지 고르게 한다. 만든 노트는 좌측 목록에 미리보기와 함께 쌓이고, 원하는 기준으로 정렬해 다시 열어 이어 쓸 수 있다.

## Blockers

01 — 개인 보관함이 없으면 노트가 누구 것인지 정할 수 없고, 소유자 전용 접근도 성립하지 않는다.

## Acceptance criteria

- [x] 좌측 패널 맨 위의 빈 카드를 누르면 형식을 고르는 창이 뜬다
- [x] 형식을 고르면 그 형식의 빈 노트가 만들어지고 바로 편집할 수 있다
- [x] 노트의 형식은 만든 뒤에 바꿀 수 없다
- [x] 제목을 직접 입력할 수 있고, 비워 두면 본문 첫 줄이 제목 자리에 쓰이며, 뽑을 내용이 없으면 형식에 맞는 기본 이름이 쓰인다
- [x] 일반 문서에서 글꼴, 글자 크기, 글자 색을 바꿀 수 있다
- [x] 일반 문서에서 굵게, 기울임, 밑줄, 취소선을 적용할 수 있다
- [x] 일반 문서에서 글머리 목록과 번호 목록을 만들 수 있다
- [x] 일반 문서에서 왼쪽·가운데·오른쪽 정렬을 고를 수 있다
- [x] 서식 메뉴가 편집 영역 아래에 고정되어 본문이 길어져도 자리를 지킨다
- [x] 적용한 서식이 노트를 다시 열었을 때 그대로 남아 있다
- [x] 사용자가 저장을 누르지 않아도 편집 내용이 보관된다
- [x] 저장 중인지, 저장됐는지, 저장이 실패했는지가 화면에 보인다
- [x] 저장이 실패해도 쓰던 내용을 잃지 않고 사용자가 실패를 알아차릴 수 있다
- [x] 다른 기기가 같은 노트를 먼저 바꿔 두었으면 조용히 덮지 않고 충돌을 알린다
- [x] 충돌 시 내 내용으로 덮을지 최신 내용을 불러올지 고를 수 있고, 고르기 전에는 어느 쪽도 사라지지 않는다
- [x] 목록의 노트 항목이 제목, 형식, 마지막 수정 시점, 내용 미리보기를 보여준다
- [x] 정렬 기준을 수정일·생성일·제목으로 바꾸면 목록 순서가 실제로 바뀌고, 순서를 뒤집을 수 있다
- [x] 목록이 패널보다 길면 목록만 스크롤되고, 새 노트 카드·경로·정렬·하단 버튼은 항상 닿을 수 있다
- [x] 좌측에서 노트를 고르면 우측에 그 노트가 열린다

## Constraints

- 화면 구성과 상태 표현은 승인된 프로토타입 `docs/specs/amu-note/prototype.html`의 `보관함`(기본)과 `일반 문서`(기본, 저장 중, 충돌 알림) 화면이 정한다.
- 형식 선택 창에는 이 시점에 실제로 만들 수 있는 형식만 나온다. Markdown은 03이, 그림판은 04가 더한다.
- 이 태스크의 목록은 평평하다. 폴더와 휴지통은 05가 가져간다.
- 노트 배경은 06이 가져간다. 이 태스크는 기본 배경 하나로만 동작한다.

## Verification

- Playwright로 새 노트 만들기 → 글과 서식 입력 → 저장됨 표시 확인 → 새로고침 후 내용과 서식 유지 → 목록에서 다시 열기까지 한 흐름으로 통과
- Playwright로 정렬 기준을 바꾸면 목록의 노트 순서가 실제로 바뀌고, 뒤집기가 동작함을 확인
- Playwright로 같은 계정의 두 세션에서 같은 노트를 고쳤을 때 충돌 알림이 뜨고, 고르기 전에는 양쪽 내용이 모두 남아 있음을 확인
- 제목을 비운 노트가 본문 첫 줄을 제목 자리에 쓰는지 확인
- `bun run test`, `bun run typecheck`, `bun run lint` 통과

## Review checkpoint

One review pass after this task.

누적 범위는 01의 계정·격리와 이 태스크의 저장 경로, 충돌 처리, 목록 전체다. 위험은 데이터 손실이다. 자동 저장과 충돌 처리는 03부터 06까지가 그대로 재사용하므로, 여기서 새는 구멍은 뒤에서 형식마다 다시 터진다. 자동 검사만으로는 "고르기 전에는 어느 쪽도 사라지지 않는다"를 충분히 못 박기 어렵다.

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
- Verification: `supabase/migrations/0002_notes.sql`를 사용자가 SQL Editor에서 적용(notes 테이블, 소유자 전용 RLS 4종, 정렬 기준별 복합 인덱스, updated_at 트리거). `bun run typecheck`·`eslint app lib components e2e`·`bun run test`(29개) 통과. Playwright e2e 11개 전부 통과(`e2e/notes.spec.ts` 5개 신규: 만들기→쓰기→서식→자동 저장→새로고침 후 유지→목록에서 재개, 제목 비움 시 본문 첫 줄, 정렬 기준 변경과 뒤집기, 충돌 알림과 양쪽 보존, 내 내용으로 덮기). 실행 중인 앱에서 직접 확인: 형식 선택 창(현재 일반 문서만), 노트 생성과 편집, 굵게·글머리 목록 적용과 인라인 style 보존, 저장 중→저장됨 전이, 두 탭으로 만든 실제 충돌 배너와 양쪽 내용 보존, 목록만 스크롤되고 새 노트 카드·경로·정렬·하단 버튼이 계속 닿는 것, 모바일 폭에서의 쌓임.
- Review: `code-review low` 1회 실행(테스트 파일 제외한 구현 diff 전체). 지적 2건. (1) 진행 중인 저장을 막는 장치가 없어 저장이 2초보다 오래 걸리면 혼자 쓰는데도 충돌 배너가 뜨는 문제 — `saveNote`에 4초 지연을 임시로 넣어 실제로 재현한 뒤, 저장을 한 번에 하나씩 보내고 보내는 동안 쌓인 변경은 끝난 뒤 이어 보내도록 고쳤다. 같은 절차로 배너가 더는 뜨지 않고 내용이 온전히 저장되는 것을 확인했다. (2) `lib/notes/queries.ts`가 조회 오류를 삼켜 빈 보관함·없는 노트로 보이는 문제 — 수용 기준을 깨지 않고 스펙이 읽기 실패 표시를 요구하지 않아 `docs/follow-ups/note-read-errors-look-like-empty.md`로 남겼다. 수정 뒤 typecheck·eslint·단위 테스트 29개·Playwright e2e 11개 재실행해 회귀 없음을 확인했고, 실행 중인 앱에서 `PRODUCT.md`의 핵심 루프(형식 고르기 → 쓰기 → 자동 보관 → 다시 찾아 이어 쓰기)를 한 바퀴 돌려 새로고침 뒤에도 남는 것까지 확인했다.
- Blocker: —
- Revision: 프로토타입의 `일반 문서`(기본)은 열자마자 "저장됨 · 시각"을 보여주므로, 처음에 두었던 "아직 바뀐 내용이 없습니다" 대기 상태를 없애고 참조에 맞췄다. 충돌 배너는 프로토타입 `.banner .grow`의 `min-width: 180px`를 따라 좁은 폭에서 문구가 제 줄을 차지하도록 고쳤다. 정렬은 기준마다 기본 방향을 따로 두도록 바꿨다(날짜는 내림차순, 제목은 오름차순). 그러지 않으면 "제목 가나다순"이 역순으로 나왔다. 새 노트 카드는 프로토타입에서 목록과 함께 스크롤되지만, 스펙의 "스크롤과 무관하게 항상 닿을 수 있다"를 만족시키려고 목록 칸 맨 위에 sticky로 두었다. 저장 실패 표시는 프로토타입에 없는 상태여서 같은 저장 상태 자리에 destructive 문구와 재시도 버튼으로 더했다. 03~06에 대한 태스크 경계·순서·수용 기준 변경은 없다.
