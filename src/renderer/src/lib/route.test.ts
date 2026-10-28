import { describe, it, expect } from "vitest";
import { parseSkillRoute, skillHref } from "./route";

describe("skill route", () => {
  it("builds a hash href from a skill id", () => {
    expect(skillHref("anthropics/skills/frontend-design")).toBe(
      "#/skills/anthropics/skills/frontend-design",
    );
  });

  it("parses the skill id back out of the hash", () => {
    expect(parseSkillRoute("#/skills/anthropics/skills/frontend-design")).toBe(
      "anthropics/skills/frontend-design",
    );
  });

  it("decodes encoded segments", () => {
    expect(parseSkillRoute("#/skills/a/b/my%20skill")).toBe("a/b/my skill");
  });

  it("ignores anything that is not a skill route", () => {
    for (const h of ["", "#", "#/", "#/skills", "#/skills/", "#/other/a/b/c"]) {
      expect(parseSkillRoute(h)).toBeNull();
    }
  });

  it("survives malformed escapes", () => {
    expect(parseSkillRoute("#/skills/a/b/%E0%A4%A")).toBeNull();
  });
});
