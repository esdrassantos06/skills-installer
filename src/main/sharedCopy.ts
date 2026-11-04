import { lstat, realpath, rm } from "node:fs/promises";
import { join } from "node:path";
import { INSTALL_DIRS } from "./installedSkills";

const SHARED_DIR = ".agents/skills";

/** Folder name the skills CLI gives a skill, mirroring its sanitizeName. */
function folderName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._]+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "")
      .slice(0, 255) || "unnamed-skill"
  );
}

const realOrNull = (p: string) => realpath(p).catch(() => null);

/**
 * Deletes `<base>/.agents/skills/<name>` unless another agent's folder links
 * to it. The skills CLI keeps that shared copy whenever any other agent has a
 * folder with the same name, even an independent copy; this removes it in
 * that case without breaking an agent that still points at it.
 * ponytail: only the agent folders in INSTALL_DIRS are checked for links.
 */
export async function removeUnlinkedSharedCopy(
  base: string,
  name: string,
): Promise<
  | { status: "removed" }
  | { status: "missing" }
  | { status: "linked"; links: string[] }
> {
  const shared = join(base, SHARED_DIR, folderName(name));
  const target = await realOrNull(shared);
  if (!target) return { status: "missing" };

  const links: string[] = [];
  for (const dir of INSTALL_DIRS) {
    if (dir === SHARED_DIR) continue;
    const candidate = join(base, dir, folderName(name));
    const info = await lstat(candidate).catch(() => null);
    if (info?.isSymbolicLink() && (await realOrNull(candidate)) === target) {
      links.push(candidate);
    }
  }
  if (links.length > 0) return { status: "linked", links };

  await rm(shared, { recursive: true, force: true });
  return { status: "removed" };
}
