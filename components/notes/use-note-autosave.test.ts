import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SaveNoteResult } from "@/lib/notes/actions";
import { localDraftKey, readLocalDraft } from "@/lib/notes/local-draft";
import type { Note } from "@/lib/notes/types";
import type { RestoreRevisionResult } from "@/lib/notes/revisions";
import { useNoteAutosave } from "./use-note-autosave";

const mocks = vi.hoisted(() => ({ save: vi.fn(), restore: vi.fn(), router: { refresh: vi.fn() } }));
vi.mock("@/lib/notes/actions", () => ({ saveNote: mocks.save }));
vi.mock("@/lib/notes/revision-actions", () => ({ restoreNoteRevision: mocks.restore }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
const note: Note = { id: "note", ownerId: "owner", format: "doc", title: "", content: { html: "원문" }, preview: "원문", version: 1, createdAt: "2026-10-29", updatedAt: "2026-10-29" };
const key = localDraftKey("owner", "note");
const readDraft = () => ({ content: { html: "원문" }, preview: "원문" });
const applyRemote = vi.fn();
const useSave = () => useNoteAutosave({ note, readDraft, applyRemote });
const saved = (version: number): SaveNoteResult => ({ status: "saved", version, updatedAt: "2026-10-29" });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  localStorage.clear();
  mocks.save.mockReset();
  mocks.restore.mockReset();
  applyRemote.mockClear();
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });

const restored: RestoreRevisionResult = { status: "restored", note: { title: "이전 제목", content: { html: "이전 본문" }, version: 3, updatedAt: "2026-11-01" } };

it("이력을 복원한 뒤 다음 편집은 복원된 버전에서 저장한다", async () => {
  mocks.restore.mockResolvedValueOnce(restored);
  const { result } = renderHook(useSave);
  await act(async () => {});
  await act(async () => { expect(await result.current.restoreFromHistory("revision")).toBe("restored"); });
  expect(result.current.title).toBe("이전 제목");
  expect(applyRemote).toHaveBeenCalledWith({ html: "이전 본문" });
  expect(result.current.status).toBe("saved");
  mocks.save.mockResolvedValueOnce(saved(4));
  act(() => result.current.setTitle("복원 후 편집"));
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ baseVersion: 3 }));
});

it("미저장 초안이 있으면 이력을 복원하지 않는다", async () => {
  const { result } = renderHook(useSave);
  await act(async () => {});
  act(() => result.current.setTitle("내 초안"));
  await act(async () => { expect(await result.current.restoreFromHistory("revision")).toBe("unsaved"); });
  expect(readLocalDraft(key)?.title).toBe("내 초안");
  expect(mocks.restore).not.toHaveBeenCalled();
});

it("연결이 끊긴 상태에서는 저장 완료인 노트도 복원을 보류한다", async () => {
  const { result } = renderHook(useSave);
  await act(async () => {});
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  await act(async () => { expect(await result.current.restoreFromHistory("revision")).toBe("unsaved"); });
  expect(mocks.restore).not.toHaveBeenCalled();
});

it("복원 실패 중 새로 쓴 내용은 초안을 지키고 자동 저장을 이어간다", async () => {
  let finish!: (result: RestoreRevisionResult) => void;
  mocks.restore.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  mocks.save.mockResolvedValueOnce(saved(2));
  const { result } = renderHook(useSave);
  await act(async () => {});
  let request!: Promise<string>;
  act(() => { request = result.current.restoreFromHistory("revision"); });
  act(() => result.current.setTitle("계속 쓴 내용"));
  await act(async () => { finish({ status: "error" }); await request; });
  expect(readLocalDraft(key)?.title).toBe("계속 쓴 내용");
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(result.current.status).toBe("saved");
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ title: "계속 쓴 내용", baseVersion: 1 }));
});

it("복원 요청 중 새 입력은 보관하고 복원 응답과 충돌로 표시한다", async () => {
  let finish!: (result: RestoreRevisionResult) => void;
  mocks.restore.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = renderHook(useSave);
  await act(async () => {});
  let request!: Promise<string>;
  act(() => { request = result.current.restoreFromHistory("revision"); });
  act(() => result.current.setTitle("복원 중 내 입력"));
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(mocks.save).not.toHaveBeenCalled();
  await act(async () => { finish(restored); await request; });
  expect(result.current.status).toBe("conflict");
  expect(result.current.title).toBe("복원 중 내 입력");
  expect(readLocalDraft(key)?.title).toBe("복원 중 내 입력");
  expect(applyRemote).not.toHaveBeenCalled();
  act(() => result.current.takeRemote());
  expect(result.current.title).toBe("이전 제목");
});

it("복원 실패는 현재 저장된 본문과 저장 상태를 유지하고 재시도할 수 있다", async () => {
  mocks.restore.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(restored);
  const { result } = renderHook(useSave);
  await act(async () => {});
  await act(async () => { expect(await result.current.restoreFromHistory("revision")).toBe("error"); });
  expect(result.current.status).toBe("saved");
  expect(result.current.title).toBe("");
  await act(async () => { expect(await result.current.restoreFromHistory("revision")).toBe("restored"); });
});

it("저장 요청 중의 새 입력은 이전 응답으로 지우지 않고 새 버전으로 이어 저장한다", async () => {
  let finishFirst!: (result: SaveNoteResult) => void;
  let finishSecond!: (result: SaveNoteResult) => void;
  mocks.save.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve; }));
  const { result } = renderHook(useSave);
  await act(async () => {});
  act(() => result.current.setTitle("첫 요청"));
  expect(result.current.status).toBe("pending");
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  act(() => result.current.setTitle("요청 중 마지막 입력"));
  await act(async () => { finishFirst(saved(2)); });
  expect(readLocalDraft(key)).toMatchObject({ title: "요청 중 마지막 입력", baseVersion: 2 });
  expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ title: "요청 중 마지막 입력", baseVersion: 2 }));
  await act(async () => { finishSecond(saved(3)); });
  expect(result.current.status).toBe("saved");
  expect(result.current.savedCount).toBe(2);
  expect(readLocalDraft(key)).toBeNull();
});

it("화면을 떠난 뒤 도착한 이전 응답이 재진입해서 쓴 초안을 지우지 않는다", async () => {
  let finish!: (result: SaveNoteResult) => void;
  mocks.save.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const first = renderHook(useSave);
  await act(async () => {});
  act(() => first.result.current.setTitle("이동 전 요청"));
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  first.unmount();
  const reopened = renderHook(useSave);
  await act(async () => {});
  act(() => reopened.result.current.setTitle("다시 열어서 쓴 내용"));
  await act(async () => { finish(saved(2)); });
  expect(readLocalDraft(key)?.title).toBe("다시 열어서 쓴 내용");
});

it("임시 저장소가 막혔으면 저장 대기 대신 실패를 알리고 새로고침에 경고한다", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
  const { result } = renderHook(useSave);
  await act(async () => {});
  act(() => result.current.setTitle("아직 보호되지 않은 입력"));
  expect(result.current.status).toBe("unprotected");
  const leave = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(leave);
  expect(leave.defaultPrevented).toBe(true);
});

it("충돌은 선택 대기로 표시하고 추가 입력 뒤에도 자동으로 덮지 않는다", async () => {
  mocks.save.mockResolvedValueOnce({ status: "conflict", latest: { title: "최신 제목", content: { html: "서버 원문" }, version: 2, updatedAt: "2026-10-29" } });
  const { result } = renderHook(useSave);
  await act(async () => {});
  act(() => result.current.setTitle("내 제목"));
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(result.current.status).toBe("conflict");
  expect(result.current.draftProtected).toBe(true);
  act(() => result.current.setTitle("충돌 중 더 쓴 제목"));
  expect(result.current.status).toBe("conflict");
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(readLocalDraft(key)?.title).toBe("충돌 중 더 쓴 제목");
  act(() => result.current.takeRemote());
  expect(result.current.status).toBe("saved");
  expect(result.current.title).toBe("최신 제목");
  expect(readLocalDraft(key)).toBeNull();
});

it.each(["예외", "오류 응답"])("%s 후에도 초안을 남기고 재시도 성공 시에만 저장 완료로 바꾼다", async (failure) => {
  if (failure === "예외") mocks.save.mockRejectedValueOnce(new Error("network"));
  else mocks.save.mockResolvedValueOnce({ status: "error", message: "저장 실패" });
  const { result } = renderHook(useSave);
  await act(async () => {});
  act(() => result.current.setTitle("다시 저장할 내용"));
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(result.current.status).toBe("error");
  expect(result.current.draftProtected).toBe(true);
  expect(result.current.savedCount).toBe(0);
  expect(readLocalDraft(key)?.title).toBe("다시 저장할 내용");
  mocks.save.mockResolvedValueOnce(saved(2));
  await act(async () => { await result.current.saveNow(); });
  expect(result.current.status).toBe("saved");
  expect(result.current.draftProtected).toBe(false);
  expect(result.current.savedCount).toBe(1);
  expect(readLocalDraft(key)).toBeNull();
});

it("연결이 끊기면 요청을 보류하고 재연결 뒤 재시도할 때 저장한다", async () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const { result } = renderHook(useSave);
  await act(async () => {});
  act(() => result.current.setTitle("연결 끊김 중 입력"));
  expect(result.current.status).toBe("offline");
  expect(result.current.draftProtected).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(mocks.save).not.toHaveBeenCalled();
  online.mockReturnValue(true);
  act(() => window.dispatchEvent(new Event("online")));
  expect(result.current.status).toBe("error");
  mocks.save.mockResolvedValueOnce(saved(2));
  await act(async () => { await result.current.saveNow(); });
  expect(result.current.status).toBe("saved");
  expect(readLocalDraft(key)).toBeNull();
});

it("연결 감지가 끊김이어도 사용자가 누른 재시도는 실제 저장 결과를 확인한다", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const { result } = renderHook(useSave);
  await act(async () => {});
  act(() => result.current.setTitle("직접 재시도할 내용"));
  expect(result.current.status).toBe("offline");
  mocks.save.mockResolvedValueOnce(saved(2));
  await act(async () => { await result.current.saveNow(); });
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe("saved");
  expect(readLocalDraft(key)).toBeNull();
});
