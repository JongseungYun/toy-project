import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLocalDraft, localDraftKey, readLocalDraft, sameDraftContent, writeLocalDraft, type LocalNoteDraft } from "./local-draft";

const draft: LocalNoteDraft = { id: "first", format: "doc", title: "초안", content: { html: "마지막 입력" }, preview: "마지막 입력", baseVersion: 1 };
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("브라우저 초안 보호", () => {
  it("같은 노트여도 계정별로 복구할 초안이 구분된다", () => {
    writeLocalDraft(localDraftKey("owner-a", "note"), draft);
    expect(readLocalDraft(localDraftKey("owner-b", "note"))).toBeNull();
    expect(readLocalDraft(localDraftKey("owner-a", "note"))).toEqual(draft);
  });
  it("이전 저장 응답으로 새 입력의 초안을 삭제하지 않는다", () => {
    const key = localDraftKey("owner", "note");
    writeLocalDraft(key, draft);
    writeLocalDraft(key, { ...draft, id: "newer", title: "더 쓴 제목" });
    clearLocalDraft(key, draft.id);
    expect(readLocalDraft(key)?.title).toBe("더 쓴 제목");
    clearLocalDraft(key, "newer");
    expect(readLocalDraft(key)).toBeNull();
  });
  it("저장소 용량 부족은 성공으로 오해하지 않는다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    expect(writeLocalDraft("draft", draft)).toBe(false);
  });
  it("서버 jsonb의 키 순서와 무관하게 이미 반영된 초안을 알아본다", () => {
    expect(sameDraftContent(
      { title: "그림", content: { elements: [{ id: "p", kind: "pen", points: [1, 2], color: "black", width: 2 }] } },
      { title: "그림", content: { elements: [{ width: 2, color: "black", points: [1, 2], kind: "pen", id: "p" }] } },
    )).toBe(true);
  });
});
