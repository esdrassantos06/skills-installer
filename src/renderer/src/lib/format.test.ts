import { describe, it, expect } from "vitest";
import { formatInstalls } from "./format";

describe("formatInstalls", () => {
  it("shows raw count below 1,000", () => {
    expect(formatInstalls(0)).toBe("0");
    expect(formatInstalls(42)).toBe("42");
    expect(formatInstalls(999)).toBe("999");
  });

  it("formats thousands with a K suffix and one decimal", () => {
    expect(formatInstalls(1000)).toBe("1.0K");
    expect(formatInstalls(1500)).toBe("1.5K");
    expect(formatInstalls(999_999)).toBe("1000.0K");
  });

  it("formats millions with an M suffix and one decimal", () => {
    expect(formatInstalls(1_000_000)).toBe("1.0M");
    expect(formatInstalls(2_500_000)).toBe("2.5M");
  });
});
