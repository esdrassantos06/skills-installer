import { describe, it, expect } from "vitest";
import { modKeyFor } from "./platform";

describe("modKeyFor", () => {
  it("uses Ctrl on Windows", () => {
    expect(modKeyFor("Win32")).toBe("Ctrl");
    expect(modKeyFor("Windows NT 10.0")).toBe("Ctrl");
  });

  it("uses the command symbol on macOS and elsewhere", () => {
    expect(modKeyFor("MacIntel")).toBe("⌘");
    expect(modKeyFor("Linux x86_64")).toBe("⌘");
    expect(modKeyFor("")).toBe("⌘");
  });

  it("does not misread Darwin as Windows", () => {
    expect(modKeyFor("Darwin")).toBe("⌘");
  });
});
