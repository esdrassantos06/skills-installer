import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { resolveSkillsCliPath } from "../src/main/skillsCli";

const expected = (...root: string[]) =>
  join(...root, "node_modules", "skills", "bin", "cli.mjs");

describe("resolveSkillsCliPath", () => {
  it("resolves inside the project root in dev", () => {
    expect(resolveSkillsCliPath("/repo")).toBe(expected("/repo"));
  });

  it("redirects a packaged app.asar path to app.asar.unpacked", () => {
    const appPath = join(
      "/Applications",
      "Skills Installer.app",
      "Contents",
      "Resources",
      "app.asar",
    );
    expect(resolveSkillsCliPath(appPath)).toBe(expected(`${appPath}.unpacked`));
  });
});
