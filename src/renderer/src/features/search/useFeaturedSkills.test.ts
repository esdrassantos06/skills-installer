import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { installMockApi, type MockApi } from "../../test/mockApi";
import { useFeaturedSkills } from "./useFeaturedSkills";
import type { Skill } from "../../../../main/searchReducer";

let mock: MockApi;

const skill = (id: string, installs: number): Skill => ({
  id,
  skillId: id,
  name: id,
  source: "owner/repo",
  installs,
});

function respondWith(map: Record<string, Skill[]>) {
  mock.api.searchSkills = vi.fn(async (q: string) => ({
    skills: map[q] ?? [],
    error: null,
    cached: false,
  }));
}

beforeEach(() => {
  mock = installMockApi();
});

describe("useFeaturedSkills", () => {
  it("starts in a loading state with no skills", () => {
    respondWith({});
    const { result } = renderHook(() => useFeaturedSkills(["react"], 40));
    expect(result.current.loading).toBe(true);
    expect(result.current.skills).toEqual([]);
  });

  it("loads, ranks across seed queries, and clears loading", async () => {
    respondWith({
      react: [skill("r1", 100)],
      design: [skill("d1", 300)],
    });
    const { result } = renderHook(() =>
      useFeaturedSkills(["react", "design"], 40),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.skills.map((s) => s.id)).toEqual(["d1", "r1"]);
  });

  it("treats an errored query as an empty result", async () => {
    mock.api.searchSkills = vi.fn(async () => ({
      skills: [skill("x", 1)],
      error: "rate limited",
      cached: false,
    }));
    const { result } = renderHook(() => useFeaturedSkills(["react"], 40));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.skills).toEqual([]);
  });

  it("retry re-enters loading and refetches", async () => {
    respondWith({});
    const { result } = renderHook(() => useFeaturedSkills(["react"], 40));
    await waitFor(() => expect(result.current.loading).toBe(false));

    respondWith({ react: [skill("r1", 5)] });
    act(() => result.current.retry());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.skills.map((s) => s.id)).toEqual(["r1"]);
  });
});
