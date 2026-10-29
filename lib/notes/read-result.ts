/** 조회 성공의 빈 값과 조회 실패를 구분한다. 서버 오류의 세부 내용은 전달하지 않는다. */
export type ReadResult<T> = { ok: true; data: T } | { ok: false };
