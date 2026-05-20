import { describe, it, expect, vi } from 'vitest';
import { getInstalledSkillNames, shouldSkip } from '../src/main/installedSkills';

describe('getInstalledSkillNames', () => {
  it('returns names of skills found in any known agent directory', async () => {
    const homedir = () => '/home/test';
    const pathExists = vi.fn((p: string) =>
      [
        '/home/test/.claude/skills/frontend-design',
        '/home/test/.agents/skills/vitest',
        '/home/test/.cursor/skills/copywriting',
      ].includes(p),
    );
    const result = await getInstalledSkillNames(
      ['frontend-design', 'vitest', 'copywriting', 'missing-one'],
      { homedir, pathExists },
    );
    expect([...result].sort()).toEqual(['copywriting', 'frontend-design', 'vitest']);
  });

  it('returns an empty set when none of the candidates are installed', async () => {
    const result = await getInstalledSkillNames(['x', 'y'], {
      homedir: () => '/home/test',
      pathExists: () => false,
    });
    expect(result.size).toBe(0);
  });

  it('returns an empty set when no candidates are passed', async () => {
    const result = await getInstalledSkillNames([], {
      homedir: () => '/home/test',
      pathExists: vi.fn(),
    });
    expect(result.size).toBe(0);
  });

  it('checks all known install paths for each candidate', async () => {
    const probed: string[] = [];
    const pathExists = (p: string) => {
      probed.push(p);
      return p.endsWith('/.agents/skills/foo');
    };
    await getInstalledSkillNames(['foo'], {
      homedir: () => '/home/test',
      pathExists,
    });
    expect(probed).toContain('/home/test/.claude/skills/foo');
    expect(probed).toContain('/home/test/.agents/skills/foo');
  });

  it('short-circuits once a candidate is found in any path', async () => {
    let calls = 0;
    const pathExists = (p: string) => {
      calls++;
      return p.endsWith('/.claude/skills/foo');
    };
    await getInstalledSkillNames(['foo'], {
      homedir: () => '/home/test',
      pathExists,
    });
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
