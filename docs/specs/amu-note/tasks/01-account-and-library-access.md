# 01 — 계정을 만들고 로그인해 내 보관함에 들어온다

## Outcome

사람이 아무노트에 처음 오면 로그인 화면을 만난다. 아이디와 비밀번호로 계정을 만들거나 Google 계정으로 들어오면, 자기 보관함이 열린다. 브라우저를 새로 고쳐도 로그인 상태가 유지되고, 로그아웃하면 다시 들어올 때까지 보관함에 닿을 수 없다. 아직 노트는 없으므로 보관함은 비어 있고, 무엇을 하면 되는지 안내한다.

## Blockers

None.

## Acceptance criteria

- [x] 로그인하지 않은 사람이 앱에 접근하면 로그인 화면을 만나고, 보관함과 노트는 보이지 않는다
- [x] 자체 계정 가입은 아이디, 비밀번호, 비밀번호 확인만 받는다
- [x] 중복 확인 버튼이 이미 쓰이는 아이디와 쓸 수 있는 아이디를 구분해 알린다
- [x] 8자 미만이거나 영문 대문자·소문자·숫자·기호 중 빠진 것이 있는 비밀번호로는 가입할 수 없고, 어떤 조건이 남았는지 입력 중에 보인다
- [x] 가입 화면이 비밀번호를 잊으면 되돌릴 방법이 없다는 사실을 가입 전에 알린다
- [x] 로그인 실패 시 아이디와 비밀번호 중 어느 쪽이 틀렸는지 구분해 알리지 않는다
- [x] Google 계정으로 들어올 수 있고, 처음 들어오는 계정이면 그 자리에서 계정이 만들어져 빈 보관함으로 이어진다
- [x] 로그인한 상태가 브라우저 새로고침 뒤에도 유지된다
- [x] 로그아웃하면 보관함에 다시 접근할 수 없다
- [x] 한 사용자의 데이터를 로그인하지 않은 사람과 다른 사용자가 읽지도 바꾸지도 못한다
- [x] 보관함이 비어 있으면 무엇을 하면 되는지 안내한다

## Constraints

- 화면 구성과 상태 표현은 승인된 프로토타입 `docs/specs/amu-note/prototype.html`의 `로그인`(기본, 로그인 실패), `회원가입`(기본, 아이디 사용 가능, 아이디 중복, 비밀번호 규칙 미충족), `보관함`(빈 보관함) 화면이 정한다.
- 계정을 무엇으로 식별하고 복구 경로를 왜 두지 않는지는 `docs/decisions/account-identity.md`가 정한다. 아이디를 Supabase Auth에 어떻게 싣는지도 그 계약을 따른다.
- Google OAuth 자격 증명과 리디렉트 URL 등록은 사용자만 할 수 있다. 필요한 값이 준비되지 않았으면 그 사실을 알리고 멈춘다.
- 이 태스크는 보관함을 비어 있는 상태까지만 만든다. 노트 만들기와 목록은 02가 가져간다.

## Verification

- Playwright로 가입 → 로그아웃 → 로그인 → 새로고침 후에도 보관함이 열림 → 로그아웃 후 보관함 접근이 막힘까지 한 흐름으로 통과
- Playwright로 서로 다른 두 계정을 만들고, 한쪽 계정의 데이터를 다른 쪽이 읽거나 바꿀 수 없음을 확인
- 중복된 아이디와 규칙에 어긋난 비밀번호로 가입이 막히는지 확인
- `bun run typecheck`와 `bun run lint` 통과

## Review checkpoint

One review pass after this task.

누적 범위는 이 태스크가 만든 계정, 세션, 소유자 격리 전체다. 위험은 접근 권한이다. 여기서 경계가 새면 이후 모든 태스크가 그 위에 쌓이므로 나중에 발견할수록 되돌리는 범위가 커진다. 자동 검사만으로는 "다른 사용자가 못 본다"를 충분히 못 박기 어렵다.

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
- Verification: Supabase Cloud 프로젝트(pevcwjlqschdwfovqzyp) 연결, `supabase/migrations/0001_profiles.sql` 적용(사용자가 SQL Editor에서 실행), 이메일 확인 비활성화, Google OAuth 클라이언트 등록까지 사용자가 완료. `bun run typecheck`·`bun run lint`(변경 범위)·`bun run test`(10/10) 통과. Playwright e2e 6개(`e2e/account.spec.ts` 5개, `e2e/account-isolation.spec.ts` 1개) 통과: 미로그인 접근 차단, 가입→로그아웃→로그인→새로고침→재로그아웃 전체 흐름, 로그인 실패 시 동일 메시지, 아이디 중복 차단, 비밀번호 규칙 위반 차단, 그리고 REST API로 직접 확인한 다른 계정 프로필 읽기/쓰기 차단(RLS). `bun run dev`로 실행 중인 앱에서 회원가입·로그아웃·로그인·새로고침·Google 로그인 리디렉션(실제 Google 동의 화면까지)을 브라우저로 직접 확인. Google 계정으로 실제 로그인을 마치는 마지막 단계는 사용자의 Google 자격 증명이 필요해 에이전트가 대신 수행하지 않았고, 리디렉션 체인이 정확한 Supabase 콜백 URL로 연결되는 것까지 확인했다.
- Review: `code-review low` 1회 실행(진단 스코프, 테스트·벤더 UI 컴포넌트 제외). 회원가입 중복 처리가 Supabase 에러 메시지의 영어 문자열 매칭에만 의존하던 문제를 확인해 `error.code`(user_already_exists/email_exists/identity_already_exists) 우선 검사로 수정. 수정 후 `bun run typecheck`와 e2e 재실행으로 회귀 없음을 확인.
- Blocker: —
- Revision: —
