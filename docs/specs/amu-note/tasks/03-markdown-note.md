# 03 — Markdown 노트를 쓰고 결과를 옆에서 확인한다

## Outcome

새 노트를 만들 때 Markdown을 고를 수 있다. 원문을 쓰는 동안 뷰어를 켜면 오른쪽에 결과가 나오고, 끄면 편집 영역이 전체 폭을 쓴다. 켜고 끈 상태는 그 노트에 기억되어 다시 열었을 때 그대로다. 저장과 목록 동작은 다른 형식과 같다.

## Blockers

02 — 형식 선택 창, 자동 저장, 목록이 거기서 생긴다.

## Acceptance criteria

- [x] 형식 선택 창에 Markdown이 나오고, 고르면 Markdown 노트가 만들어진다
- [x] Markdown 원문을 직접 입력할 수 있다
- [x] 뷰어를 켜면 편집 영역 오른쪽에 결과가 나온다
- [x] 뷰어를 끄면 편집 영역이 전체 폭을 쓴다
- [x] 뷰어가 제목, 목록, 강조, 코드, 인용, 표, 링크를 결과로 보여준다
- [x] 뷰어를 켜고 끈 상태가 그 노트에 기억되어 다시 열었을 때 유지된다
- [x] Markdown 노트도 02와 같은 규칙으로 자동 저장되고 충돌을 알린다
- [x] 목록에서 Markdown 노트가 형식과 내용 미리보기와 함께 보인다

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
completed

## Execution

<!-- Append concise evidence and preserve earlier entries when status changes.
Execution Blocker is the current impediment for an active task, not a declared
task dependency. In a superseded task, preserved entries are historical. -->
- Verification: `bun run typecheck`·`eslint app lib components e2e`·`bun run test`(32개) 통과. Playwright e2e 14개 전부 통과(`e2e/markdown.spec.ts` 3개 신규: 만들기→원문 입력→뷰어가 제목·목록·강조·코드·인용·표·링크를 결과로 보여줌→목록에 형식과 원문 미리보기→새로고침 후 원문 유지, 뷰어 끄기와 노트별 상태 기억, Markdown 노트의 충돌 알림과 양쪽 보존). 태스크 02의 e2e 5개도 함께 재실행해 회귀가 없음을 확인했다. 실행 중인 앱에서 직접 확인: 형식 선택 창에 Markdown이 나오고 고르면 좌우 분할로 열리는 것, 일곱 가지 요소가 모두 결과로 나오는 것, 뷰어를 끄면 원문이 전체 폭을 쓰고 그 상태가 다시 열었을 때 유지되는 것, 좁은 화면(375px)에서 원문 위·뷰어 아래로 쌓이는 것, 그리고 다시 열어 이어 쓴 내용이 저장되는 것.
- Blocker: —
- Revision: 세 형식이 같은 저장 규칙을 쓰도록, 태스크 02가 한 파일에 두었던 자동 저장·충돌 처리를 `components/notes/use-note-autosave.ts`로, 공통 머리말과 충돌 배너를 `components/notes/note-frame.tsx`로 빼냈다. `note-editor.tsx`는 `doc-editor.tsx`가 됐고 동작은 그대로다(02의 e2e 5개로 확인). 목록 미리보기가 줄 구조를 보존하도록 `previewFromHtml`을 고쳤고, 그 덕분에 제목 자리에 본문 첫 줄만 들어간다. Markdown은 원문을 그대로 미리보기로 쓰고(프로토타입 썸네일이 `#`와 `-`를 보여준다) 제목 자리에서는 그 기호만 떼어낸다. 뷰어 상태는 본문과 같은 `content`에 담아 같은 저장 경로로 남긴다. 저장 표시에 `data-state`를 달아 뷰어 토글의 저장 완료를 테스트가 기다릴 수 있게 했다. 04~07에 대한 태스크 경계·순서·수용 기준 변경은 없다.
- Review: 이 태스크는 `Review checkpoint: None`이고 `AGENTS.md`의 검증·리뷰 예산이 자동 리뷰를 최대 1회로 제한하므로, 02에서 쓴 한 번으로 갈음하고 따로 돌리지 않았다.
