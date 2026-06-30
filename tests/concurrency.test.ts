import { describe, it, expect } from "vitest";
import {
  resolveConcurrency,
  MAX_INSTALL_CONCURRENCY,
} from "../src/main/concurrency";

describe("resolveConcurrency", () => {
  it("is zero when there is no work", () => {
    expect(resolveConcurrency(0, { cpuCount: 8 })).toBe(0);
  });

  it("never exceeds the number of planned installs", () => {
    expect(resolveConcurrency(2, { env: "16", cpuCount: 8 })).toBe(2);
    expect(resolveConcurrency(1, { cpuCount: 32 })).toBe(1);
  });

  it("honors a valid env override", () => {
    expect(resolveConcurrency(100, { env: "5", cpuCount: 2 })).toBe(5);
  });

  it("clamps the env override to the hard maximum", () => {
    expect(resolveConcurrency(100, { env: "999", cpuCount: 2 })).toBe(
      MAX_INSTALL_CONCURRENCY,
    );
  });

  it("ignores invalid env values and falls back to the cpu default", () => {
    for (const env of ["", "abc", "0", "-3", "2.5"]) {
      expect(resolveConcurrency(100, { env, cpuCount: 8 })).toBe(7);
    }
  });

  it("scales the default to cpu count minus one, capped at 8", () => {
    expect(resolveConcurrency(100, { cpuCount: 1 })).toBe(1);
    expect(resolveConcurrency(100, { cpuCount: 4 })).toBe(3);
    expect(resolveConcurrency(100, { cpuCount: 16 })).toBe(8);
  });
});
