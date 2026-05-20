import { describe, it, expect } from 'vitest';
import { extractSkillNames } from '../src/main/parser';

describe('extractSkillNames', () => {
  it('returns empty for a bare repo source', () => {
    expect(extractSkillNames('vercel-labs/agent-skills', [])).toEqual([]);
  });

  it('extracts the skill from owner/repo@skill', () => {
    expect(extractSkillNames('vercel-labs/agent-skills@vercel-react-best-practices', [])).toEqual([
      'vercel-react-best-practices',
    ]);
  });

  it('extracts from a github URL with @skill suffix', () => {
    expect(
      extractSkillNames('https://github.com/anthropics/skills@frontend-design', []),
    ).toEqual(['frontend-design']);
  });

  it('ignores the @ in an SSH-style URL (git@github.com)', () => {
    expect(extractSkillNames('git@github.com:foo/bar.git', [])).toEqual([]);
  });

  it('extracts from --skill flag', () => {
    expect(
      extractSkillNames('vercel-labs/agent-skills', ['--skill', 'react-best-practices']),
    ).toEqual(['react-best-practices']);
  });

  it('extracts from short -s flag', () => {
    expect(extractSkillNames('vercel-labs/agent-skills', ['-s', 'react'])).toEqual(['react']);
  });

  it('extracts multiple --skill flags', () => {
    expect(
      extractSkillNames('vercel-labs/agent-skills', [
        '--skill',
        'react',
        '--skill',
        'nextjs',
      ]),
    ).toEqual(['react', 'nextjs']);
  });

  it('combines @ suffix and --skill flags', () => {
    expect(
      extractSkillNames('vercel-labs/agent-skills@react', ['--skill', 'nextjs']),
    ).toEqual(['react', 'nextjs']);
  });

  it('ignores --skill when the value is missing', () => {
    expect(extractSkillNames('vercel-labs/agent-skills', ['--skill'])).toEqual([]);
  });

  it('rejects @ values that are not valid skill names', () => {
    expect(extractSkillNames('foo/bar@v1.2.3', [])).toEqual([]);
    expect(extractSkillNames('foo/bar@', [])).toEqual([]);
  });

  it('accepts underscored and numbered skill names', () => {
    expect(extractSkillNames('foo/bar@my_skill_2', [])).toEqual(['my_skill_2']);
  });
});
