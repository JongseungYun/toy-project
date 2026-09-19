// 좌측 목록에서 노트를 끌어다 폴더에 놓는 동작.
//
// 끌고 다니는 것이 노트인지, 어느 노트인지는 브라우저의 DataTransfer에 담긴다.
// 화면이 그 값을 직접 다루지 않도록 여기서 한 가지 모양으로 읽고 쓴다.

/** 우리 노트라는 표시. 다른 곳에서 끌어온 파일이나 글과 섞이지 않게 한다. */
export const NOTE_DRAG_TYPE = "application/x-amu-note";

/** DataTransfer에서 우리가 쓰는 부분만. 테스트가 이 모양으로 흉내 낸다. */
export type DragPayload = Pick<DataTransfer, "types" | "getData">;

/** 지금 끌고 있는 것이 이 앱의 노트인가. */
export function carriesNote(transfer: DragPayload | null | undefined): boolean {
  return Boolean(transfer?.types?.includes(NOTE_DRAG_TYPE));
}

/**
 * 끌고 온 노트의 id. 우리 노트가 아니면 null이다.
 *
 * dragover 중에는 브라우저가 값을 감춰 getData가 빈 문자열을 준다. 그래서
 * 받을 수 있는지는 types로 보고, id는 drop에서만 읽는다.
 */
export function noteIdFrom(transfer: DragPayload | null | undefined): string | null {
  if (!carriesNote(transfer)) return null;
  const id = transfer!.getData(NOTE_DRAG_TYPE).trim();
  return id || null;
}
