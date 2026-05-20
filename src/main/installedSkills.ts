import { existsSync } from 'node:fs';
import { homedir as defaultHomedir } from 'node:os';
import { join } from 'node:path';

/**
 * Pre-flight check for "already installed" skills, by filesystem inspection.
 *
 * Each agent the skills CLI supports installs to a known directory under the
 * user home. A skill is considered installed if its named subdirectory exists
 * in any of those locations. This is faster and more reliable than calling
 * `npx skills list --json` and parsing, which spawns a process, can produce
 * large output that's awkward to stream, and depends on the CLI's manifest
 * staying in sync with what's actually on disk.
 *
 * The function is injection-friendly: tests pass mock `homedir` and
 * `pathExists` implementations.
 */
export type Deps = {
  homedir: () => string;
  pathExists: (path: string) => boolean;
};

const defaultDeps: Deps = {
  homedir: defaultHomedir,
  pathExists: existsSync,
};

const INSTALL_DIRS = [
  '.claude/skills',
  '.cursor/skills',
  '.codex/skills',
  '.opencode/skills',
  '.gemini/antigravity/skills',
  '.windsurf/skills',
  '.continue/skills',
  '.copilot/skills',
  '.agents/skills',
];

export async function getInstalledSkillNames(
  candidates: string[],
  deps: Deps = defaultDeps,
): Promise<Set<string>> {
  const out = new Set<string>();
  if (candidates.length === 0) return out;

  const home = deps.homedir();
  for (const name of candidates) {
    for (const dir of INSTALL_DIRS) {
      if (deps.pathExists(join(home, dir, name))) {
        out.add(name);
        break;
      }
    }
  }
  return out;
}

export function shouldSkip(
  skillNames: string[],
  installed: Set<string>,
  force: boolean,
): boolean {
  if (force) return false;
  if (skillNames.length === 0) return false;
  return skillNames.every((name) => installed.has(name));
}
