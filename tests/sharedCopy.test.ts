import { mkdir, mkdtemp, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { removeUnlinkedSharedCopy } from "../src/main/sharedCopy";

async function skillDir(path: string) {
  await mkdir(path, { recursive: true });
  await writeFile(join(path, "SKILL.md"), "---\nname: x\n---\n");
}

const exists = (p: string) =>
  stat(p).then(
    () => true,
    () => false,
  );

async function base() {
  const dir = await mkdtemp(join(tmpdir(), "shared-"));
  await skillDir(join(dir, ".agents/skills/supa"));
  return dir;
}

describe("removeUnlinkedSharedCopy", () => {
  it("deletes the shared copy when other agents keep their own copies", async () => {
    const dir = await base();
    await skillDir(join(dir, ".claude/skills/supa"));

    expect(await removeUnlinkedSharedCopy(dir, "supa")).toEqual({
      status: "removed",
    });
    expect(await exists(join(dir, ".agents/skills/supa"))).toBe(false);
    expect(await exists(join(dir, ".claude/skills/supa/SKILL.md"))).toBe(true);
  });

  it("keeps the shared copy while another agent folder links to it", async () => {
    const dir = await base();
    await mkdir(join(dir, ".claude/skills"), { recursive: true });
    await symlink(
      "../../.agents/skills/supa",
      join(dir, ".claude/skills/supa"),
    );

    expect(await removeUnlinkedSharedCopy(dir, "supa")).toEqual({
      status: "linked",
      links: [join(dir, ".claude/skills/supa")],
    });
    expect(await exists(join(dir, ".agents/skills/supa/SKILL.md"))).toBe(true);
  });

  it("reports a shared copy that is already gone", async () => {
    const dir = await mkdtemp(join(tmpdir(), "shared-"));
    expect(await removeUnlinkedSharedCopy(dir, "supa")).toEqual({
      status: "missing",
    });
  });

  it("uses the CLI's folder name for display names", async () => {
    const dir = await mkdtemp(join(tmpdir(), "shared-"));
    await skillDir(join(dir, ".agents/skills/svg-logo-designer"));
    expect(await removeUnlinkedSharedCopy(dir, "SVG Logo Designer")).toEqual({
      status: "removed",
    });
  });

  it("never leaves the shared folder for path-like names", async () => {
    const dir = await base();
    await skillDir(join(dir, ".claude/skills/x"));
    expect(
      await removeUnlinkedSharedCopy(dir, "../../.claude/skills/x"),
    ).toEqual({ status: "missing" });
    expect(await exists(join(dir, ".claude/skills/x"))).toBe(true);
  });
});
