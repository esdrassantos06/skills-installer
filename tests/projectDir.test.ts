import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { resolveProjectDir } from "../src/main/projectDir";

describe("resolveProjectDir", () => {
  it("returns null when no folder was chosen", async () => {
    expect(await resolveProjectDir(null)).toBeNull();
    expect(await resolveProjectDir(undefined)).toBeNull();
    expect(await resolveProjectDir("")).toBeNull();
  });

  it("returns an existing absolute directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "proj-"));
    expect(await resolveProjectDir(dir)).toBe(dir);
  });

  it("rejects relative paths and non-strings", async () => {
    await expect(resolveProjectDir("some/dir")).rejects.toThrow();
    await expect(resolveProjectDir(42)).rejects.toThrow();
  });

  it("rejects a folder that no longer exists or is a file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "proj-"));
    const file = join(dir, "file.txt");
    await writeFile(file, "x");
    await expect(resolveProjectDir(join(dir, "gone"))).rejects.toThrow(
      /Folder not found/,
    );
    await expect(resolveProjectDir(file)).rejects.toThrow(/Folder not found/);
  });
});
