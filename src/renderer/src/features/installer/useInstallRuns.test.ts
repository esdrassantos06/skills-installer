import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { installMockApi, type MockApi } from "../../test/mockApi";
import { useInstallRuns } from "./useInstallRuns";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

const planEvent = {
  total: 2,
  commands: [
    { display: "cmd one", source: "a/b@one" },
    { display: "cmd two", source: "c/d@two" },
  ],
};

describe("useInstallRuns", () => {
  it("starts empty and idle", () => {
    const { result } = renderHook(() => useInstallRuns());
    expect(result.current.runs).toEqual([]);
    expect(result.current.running).toBe(false);
    expect(result.current.summary).toBeNull();
  });

  it("builds pending runs from a plan event", () => {
    const { result } = renderHook(() => useInstallRuns());
    act(() => mock.emit("plan", planEvent));
    expect(result.current.runs).toHaveLength(2);
    expect(result.current.runs[0]).toMatchObject({
      source: "a/b@one",
      status: "pending",
    });
  });

  it("reflects the full start/log/done lifecycle", () => {
    const { result } = renderHook(() => useInstallRuns());
    act(() => mock.emit("plan", planEvent));
    act(() => mock.emit("start", { index: 0, cmd: "running cmd" }));
    act(() => mock.emit("log", { index: 0, stream: "out", text: "line" }));
    act(() =>
      mock.emit("done", { index: 0, code: 0, alreadyInstalled: false }),
    );
    expect(result.current.runs[0]).toMatchObject({
      status: "ok",
      log: [{ stream: "out", text: "line" }],
    });
  });

  it("finished sets the summary and stops running", () => {
    const { result } = renderHook(() => useInstallRuns());
    act(() => (result.current.running, undefined));
    act(() => mock.emit("finished", { ok: 2, fail: 0, skipped: 1 }));
    expect(result.current.summary).toEqual({ ok: 2, fail: 0, skipped: 1 });
    expect(result.current.running).toBe(false);
  });

  it("start() resets state, flips running on, and calls installAll", async () => {
    const { result } = renderHook(() => useInstallRuns());
    act(() => mock.emit("plan", planEvent));
    await act(async () => {
      await result.current.start(["a/b@one"], {
        agents: ["claude-code"],
        global: true,
        force: false,
      });
    });
    expect(mock.api.installAll).toHaveBeenCalledWith(["a/b@one"], {
      agents: ["claude-code"],
      global: true,
      force: false,
    });
  });

  it("toggle flips a run's expanded flag", () => {
    const { result } = renderHook(() => useInstallRuns());
    act(() => mock.emit("plan", planEvent));
    act(() => result.current.toggle(0));
    expect(result.current.runs[0].expanded).toBe(true);
  });

  it("unsubscribes from every channel on unmount", () => {
    const { unmount } = renderHook(() => useInstallRuns());
    expect(mock.listenerCount("plan")).toBe(1);
    expect(mock.listenerCount("finished")).toBe(1);
    unmount();
    expect(mock.listenerCount("plan")).toBe(0);
    expect(mock.listenerCount("finished")).toBe(0);
  });
});
