# 07 — 아홉 개 언어로 쓴다

## Outcome

처음 들어온 사람은 브라우저 언어로 앱을 만난다. 지원하지 않는 언어면 영어로 시작한다. 설정에서 아홉 개 언어 중 하나를 고르면 계정에 저장되어 다른 기기에서 열어도 그 언어로 나온다. 노트 내용은 사용자의 것이므로 언어 설정과 무관하게 그대로 있다. 설정에서 앱 정보도 볼 수 있다.

## Blockers

01 — 언어 설정을 계정에 저장하려면 계정이 있어야 하고, 설정 화면은 로그인한 뒤에 열린다.

## Acceptance criteria

- [x] 표시 언어를 영어, 프랑스어, 독일어, 이탈리아어, 스페인어, 중국어 간체, 중국어 번체, 일본어, 한국어 중에서 고를 수 있다
- [x] 처음 들어온 사람은 브라우저 언어를 따른다
- [x] 브라우저 언어가 지원 목록에 없으면 영어로 시작한다
- [x] 설정에서 언어를 바꾸면 계정에 저장되어 다른 기기에서 열어도 그 언어로 나온다
- [x] 노트 제목과 본문은 언어 설정과 무관하게 그대로 남는다
- [x] 아홉 개 언어 모두에서 화면 문구가 잘리거나 넘치지 않는다
- [x] 설정에서 앱 정보를 볼 수 있다
- [x] 로그아웃이 이 기기에서만 나가고 다른 기기의 로그인은 건드리지 않는다

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
completed

## Execution

<!-- Append concise evidence and preserve earlier entries when status changes.
Execution Blocker is the current impediment for an active task, not a declared
task dependency. In a superseded task, preserved entries are historical. -->
- Verification: `supabase/migrations/0005_display_language.sql`를 사용자가 SQL Editor에서 적용(profiles.locale). `bun run typecheck`·`eslint app lib components e2e`·`bun run test`(60개, 언어 결정 8개 신규) 통과. Playwright e2e 37개 전부 통과(`e2e/language.spec.ts` 5개 신규): 브라우저 언어(de/ja/zh-TW)를 따라 시작하고 지원하지 않는 언어(pt-BR)는 영어로 시작, 설정에서 바꾼 언어가 계정에 저장되어 다른 기기에서도 유지, 언어를 바꿔도 노트 제목과 본문이 그대로, 아홉 개 언어 × 세 화면에서 가로 넘침과 잘린 문구가 없음, 설정의 앱 정보. 실행 중인 앱에서 독일어로 바꿔 설정·보관함·편집 화면을 직접 확인했다. 사용자가 지은 폴더 이름과 노트 내용은 한국어 그대로 남고, 시각은 그 언어의 관례(독일어는 24시간제)로 나온다.
- Blocker: —
- Revision: 언어는 라우트가 아니라 계정과 Accept-Language로 정한다. 스펙이 주소에 언어를 싣기를 요구하지 않고, "계정에 저장되어 다른 기기에서도 그대로"가 핵심이기 때문이다. 서버 컴포넌트는 `getMessages()`로, 클라이언트 컴포넌트는 `I18nProvider` 컨텍스트로 같은 사전을 받는다. `Messages` 타입이 아홉 사전의 형태를 강제해서 빠진 문구는 typecheck에서 잡힌다. 날짜와 시각은 `Intl`에 고른 언어를 넘기고 "어제"처럼 언어마다 다른 말만 사전에서 받는다. 이 과정에서 하드코딩돼 있던 `Asia/Seoul` 고정 시간대를 걷어내 실행 환경의 시간대를 따르게 했다. 화면에 쓰이지 않게 된 한글 label(색 이름, 선 굵기, 정렬 기준)은 데이터 모듈에서 걷어내고 사전으로 옮겼다. 로그인 화면은 아직 누구인지 모르므로 브라우저 언어를 따르고, 들어온 뒤에 계정 언어로 바뀐다. 표시 언어가 브라우저를 따르게 되면서 Playwright의 기본 언어(en-US)로는 01~06의 한국어 선택자가 모두 어긋난다. `playwright.config.ts`의 chromium project에 `locale: "ko-KR"`을 두어 기존 스펙이 한국어 화면을 그대로 확인하게 했고, 언어 자체를 보는 스펙만 필요한 언어로 context를 직접 연다.
- Review: 이 태스크는 `Review checkpoint: None`이고 `AGENTS.md`의 검증·리뷰 예산이 자동 리뷰를 최대 1회로 제한하므로, 02에서 쓴 한 번으로 갈음하고 따로 돌리지 않았다.
- Note: Supabase 무료 플랜의 가입 속도 제한 때문에 e2e는 `--workers=2`로 돌린다. 높은 병렬도에서는 가입이 막혀 실패한다.
