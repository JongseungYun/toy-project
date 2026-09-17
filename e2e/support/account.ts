// 태스크 01 e2e에서 공유하는 계정 관련 헬퍼.
// 아이디는 테스트마다 겹치지 않도록 매번 새로 만든다.

export const TEST_PASSWORD = "Gureum2026!";

export function uniqueUsername(prefix = "e2e") {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  return `${prefix}${suffix}`.toLowerCase().slice(0, 20);
}
