import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { getInstalledSkillNames, shouldSkip } from '../src/main/installedSkills';

const HOME = '/home/test';
const homedir = () => HOME;

describe('getInstalledSkillNames', () => {
  it('returns names of skills found in any known agent directory', async () => {
    const installed = new Set([
      join(HOME, '.claude/skills/frontend-design'),
      join(HOME, '.agents/skills/vitest'),
      join(HOME, '.cursor/skills/copywriting'),
    ]);
    const pathExists = (p: string) => installed.has(p);
    const result = await getInstalledSkillNames(
      ['frontend-design', 'vitest', 'copywriting', 'missing-one'],
      { homedir, pathExists },
    );
    expect([...result].sort()).toEqual(['copywriting', 'frontend-design', 'vitest']);
  });

  it('returns an empty set when none of the candidates are installed', async () => {
    const result = await getInstalledSkillNames(['x', 'y'], {
      homedir,
      pathExists: () => false,
    });
    expect(result.size).toBe(0);
  });

  it('returns an empty set when no candidates are passed', async () => {
    const result = await getInstalledSkillNames([], {
      homedir,
      pathExists: vi.fn(),
    });
    expect(result.size).toBe(0);
  });

  it('checks all known install paths for each candidate', async () => {
    const probed: string[] = [];
    const matchPath = join(HOME, '.agents/skills/foo');
    const pathExists = (p: string) => {
      probed.push(p);
      return p === matchPath;
    };
    await getInstalledSkillNames(['foo'], { homedir, pathExists });
    expect(probed).toContain(join(HOME, '.claude/skills/foo'));
    expect(probed).toContain(matchPath);
  });

  it('short-circuits once a candidate is found in any path', async () => {
    let calls = 0;
    const matchPath = join(HOME, '.claude/skills/foo');
    const pathExists = (p: string) => {
      calls++;
      return p === matchPath;
    };
    await getInstalledSkillNames(['foo'], { homedir, pathExists });
    expect(calls).toBe(1);
  });
});

describe('shouldSkip', () => {
  it('does not skip when force is true', () => {
    expect(shouldSkip(['react'], new Set(['react']), true)).toBe(false);
  });

  it('does not skip when there are no skill names extracted', () => {
    expect(shouldSkip([], new Set(['react']), false)).toBe(false);
  });

  it('does not skip when at least one skill is not installed', () => {
    expect(shouldSkip(['react', 'nextjs'], new Set(['react']), false)).toBe(false);
  });

  it('skips when every referenced skill is installed', () => {
    expect(
      shouldSkip(['react', 'nextjs'], new Set(['react', 'nextjs', 'vitest']), false),
    ).toBe(true);
  });

  it('skips for a single installed skill', () => {
    expect(shouldSkip(['react'], new Set(['react']), false)).toBe(true);
  });
});
