import { describe, it, expect } from "vitest";
import { appendUniqueLines, parseSkillLines } from "./lines";

describe("parseSkillLines", () => {
  it("trims, drops blank lines, and ignores # comments", () => {
    const input = "  a/b@one \n\n# a comment\nc/d@two\n   \n";
    expect(parseSkillLines(input)).toEqual(["a/b@one", "c/d@two"]);
  });

  it("returns an empty array for empty or comment-only input", () => {
    expect(parseSkillLines("")).toEqual([]);
    expect(parseSkillLines("# just a comment\n   ")).toEqual([]);
  });
});

describe("appendUniqueLines", () => {
  it("appends new lines with a trailing newline", () => {
    expect(appendUniqueLines("", ["a/b@one"])).toBe("a/b@one\n");
    expect(appendUniqueLines("a/b@one\n", ["c/d@two"])).toBe(
      "a/b@one\nc/d@two\n",
    );
  });

  it("skips lines already present (compared trimmed)", () => {
    expect(appendUniqueLines("a/b@one\n", ["a/b@one"])).toBe("a/b@one\n");
    expect(appendUniqueLines("  a/b@one  \n", ["a/b@one"])).toBe(
      "  a/b@one  \n",
    );
  });

  it("appends only the fresh lines from a batch", () => {
    expect(appendUniqueLines("a/b@one\n", ["a/b@one", "c/d@two"])).toBe(
      "a/b@one\nc/d@two\n",
    );
  });

  it("normalizes trailing whitespace before appending", () => {
    expect(appendUniqueLines("a/b@one\n\n\n", ["c/d@two"])).toBe(
      "a/b@one\nc/d@two\n",
    );
  });
});
