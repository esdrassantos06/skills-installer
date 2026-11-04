import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  addProject,
  removeProject,
  setProjectFolder,
  useProjects,
} from "./projectFolder";

describe("project list", () => {
  it("adds projects once, in the order they were added", () => {
    const { result } = renderHook(() => useProjects());
    act(() => {
      addProject("/a");
      addProject("/b");
      addProject("/a");
    });
    expect(result.current).toEqual(["/a", "/b"]);
  });

  it("removes a project", () => {
    const { result } = renderHook(() => useProjects());
    act(() => {
      addProject("/a");
      addProject("/b");
      removeProject("/a");
    });
    expect(result.current).toEqual(["/b"]);
  });

  it("adds the installer's target folder to the list", () => {
    const { result } = renderHook(() => useProjects());
    act(() => setProjectFolder("/proj"));
    expect(result.current).toEqual(["/proj"]);
  });
});
