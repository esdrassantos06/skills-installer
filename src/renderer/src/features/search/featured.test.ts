import { describe, it, expect } from "vitest";
import { rankFeatured } from "./featured";
import type { Skill } from "../../../../main/searchReducer";

const skill = (id: string, installs: number): Skill => ({
  id,
  skillId: id,
  name: id,
  source: "owner/repo",
  installs,
});

describe("rankFeatured", () => {
  it("flattens batches and sorts by installs descending", () => {
    const result = rankFeatured(
      [[skill("a", 10), skill("b", 300)], [skill("c", 50)]],
      10,
    );
    expect(result.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("deduplicates by id, keeping the first occurrence", () => {
    const result = rankFeatured(
      [[skill("a", 10)], [skill("a", 999), skill("b", 5)]],
      10,
    );
    expect(result).toHaveLength(2);
    expect(result.find((s) => s.id === "a")?.installs).toBe(10);
  });

  it("limits the result to the requested size", () => {
    const batch = Array.from({ length: 100 }, (_, i) => skill(`s${i}`, i));
    expect(rankFeatured([batch], 40)).toHaveLength(40);
  });

  it("returns an empty array when given no skills", () => {
    expect(rankFeatured([], 40)).toEqual([]);
    expect(rankFeatured([[], []], 40)).toEqual([]);
  });
});
