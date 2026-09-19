// 읽기 전용 공유 링크.
//
// 링크를 가진 사람은 로그인 없이 노트를 읽을 수 있다. 고칠 수는 없다.
// docs/decisions/note-sharing.md 참고.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 주소에서 온 열쇠가 열쇠 모양인지 본다. 모양이 아니면 데이터베이스에 묻지 않는다.
 * uuid가 아닌 값을 그대로 넘기면 조회가 아니라 형 변환 오류가 난다.
 */
export function isShareToken(value: string): boolean {
  return UUID.test(value);
}

/** 공유 링크의 주소. 링크를 만드는 화면과 읽는 화면이 같은 규칙을 쓴다. */
export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/share/${token}`;
}
