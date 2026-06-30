import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { installMockApi, type MockApi } from "../../test/mockApi";
import { useSkillSearch } from "./useSkillSearch";
import type { Skill } from "../../../../main/searchReducer";

let mock: MockApi;

const skill = (id: string): Skill => ({
  id,
  skillId: id,
  name: id,
  source: "owner/repo",
  installs: 1,
});

beforeEach(() => {
  mock = installMockApi();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSkillSearch", () => {
  it("does not search for queries shorter than 2 characters", async () => {
    const { result } = renderHook(() => useSkillSearch());
    act(() => result.current.dispatch({ type: "queryChanged", query: "r" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mock.api.searchSkills).not.toHaveBeenCalled();
  });

  it("debounces rapid typing into a single search for the latest query", async () => {
    mock.api.searchSkills = vi.fn(async () => ({
      skills: [skill("react-1")],
      error: null,
      cached: false,
    }));
    const { result } = renderHook(() => useSkillSearch());
    act(() => result.current.dispatch({ type: "queryChanged", query: "re" }));
    act(() => result.current.dispatch({ type: "queryChanged", query: "rea" }));
    act(() =>
      result.current.dispatch({ type: "queryChanged", query: "react" }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mock.api.searchSkills).toHaveBeenCalledTimes(1);
    expect(mock.api.searchSkills).toHaveBeenCalledWith("react");
    expect(result.current.state.results.map((s) => s.id)).toEqual(["react-1"]);
  });

  it("records an error from a failed search", async () => {
    mock.api.searchSkills = vi.fn(async () => ({
      skills: [],
      error: "rate limited",
      cached: false,
    }));
    const { result } = renderHook(() => useSkillSearch());
    act(() =>
      result.current.dispatch({ type: "queryChanged", query: "react" }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.state.error).toBe("rate limited");
  });
});
