# 전체 린트에 스킬의 평가용 코드가 포함됨

**Symptom**: 앱 변경과 무관한 스킬 fixture가 전체 린트를 실패시킨다.

**Observed evidence**: 2026-10-30 `bun run lint`에서 `.agents/skills`와 `.claude/skills`의 `babysit-specs`·`shape-idea` 평가용 `server.js` 6개에 `@typescript-eslint/no-require-imports` 18개 오류가 발생했다.

**Suspected cause**: `eslint.config.mjs`의 ignore에 설치된 스킬의 평가용 디렉터리가 없다.

**What was tried**: `bun run lint -- app components lib e2e`는 통과했다. R04 범위에서는 스킬과 린트 설정을 바꾸지 않았다.

**Proposed next step**: 앱 검증 대상과 설치된 스킬 fixture의 경계를 정하고 전역 ignore 범위를 조정한다.
