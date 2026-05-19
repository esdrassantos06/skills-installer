import { describe, it, expect } from 'vitest';
import { parseLine, detectAlreadyInstalled } from '../src/main/parser';

const baseOpts = { agents: ['claude-code'], global: true, force: false };

describe('parseLine', () => {
  it('returns null for empty lines', () => {
    expect(parseLine('', baseOpts)).toBeNull();
    expect(parseLine('   ', baseOpts)).toBeNull();
  });

  it('ignores comments', () => {
    expect(parseLine('# nothing', baseOpts)).toBeNull();
    expect(parseLine('  # spaced', baseOpts)).toBeNull();
  });

  it('parses bare owner/repo@skill', () => {
    const r = parseLine('vercel-labs/agent-skills@react', baseOpts)!;
    expect(r.source).toBe('vercel-labs/agent-skills@react');
    expect(r.args).toContain('vercel-labs/agent-skills@react');
    expect(r.args).toContain('-g');
    expect(r.args).toEqual(expect.arrayContaining(['-a', 'claude-code']));
    expect(r.args.filter((a) => a === '-y').length).toBeGreaterThan(0);
  });

  it('strips leading "npx skills add"', () => {
    const r = parseLine(
      'npx skills add anthropics/skills@frontend-design',
      baseOpts,
    )!;
    expect(r.source).toBe('anthropics/skills@frontend-design');
    expect(r.args).toContain('anthropics/skills@frontend-design');
  });

  it('strips leading "npx -y skills add"', () => {
    const r = parseLine(
      'npx -y skills add foo/bar@baz',
      baseOpts,
    )!;
    expect(r.source).toBe('foo/bar@baz');
  });

  it('expands multiple agents', () => {
    const r = parseLine('foo/bar', {
      ...baseOpts,
      agents: ['claude-code', 'cursor', 'antigravity'],
    })!;
    const pairs: string[][] = [];
    for (let i = 0; i < r.args.length - 1; i++) {
      if (r.args[i] === '-a') pairs.push([r.args[i], r.args[i + 1]]);
    }
    expect(pairs).toEqual([
      ['-a', 'claude-code'],
      ['-a', 'cursor'],
      ['-a', 'antigravity'],
    ]);
  });

  it('respects user-provided --agent over defaults', () => {
    const r = parseLine('foo/bar -a cursor', {
      ...baseOpts,
      agents: ['claude-code'],
    })!;
    const agentValues = r.args
      .map((v, i) => (r.args[i - 1] === '-a' ? v : null))
      .filter(Boolean);
    expect(agentValues).toEqual(['cursor']);
    expect(agentValues).not.toContain('claude-code');
  });

  it('adds --force when force option is set', () => {
    const r = parseLine('foo/bar', { ...baseOpts, force: true })!;
    expect(r.args).toContain('--force');
  });

  it('omits --force when option is false', () => {
    const r = parseLine('foo/bar', baseOpts)!;
    expect(r.args).not.toContain('--force');
  });

  it('honors user-provided --force flag', () => {
    const r = parseLine('foo/bar --force', baseOpts)!;
    expect(r.args).toContain('--force');
  });

  it('honors --no-global override', () => {
    const r = parseLine('foo/bar --no-global', baseOpts)!;
    expect(r.args).not.toContain('-g');
  });

  it('handles GitHub URLs', () => {
    const r = parseLine(
      'https://github.com/vercel-labs/skills',
      baseOpts,
    )!;
    expect(r.source).toBe('https://github.com/vercel-labs/skills');
  });

  it('parses quoted argument bundle', () => {
    const r = parseLine(
      '"https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices"',
      baseOpts,
    )!;
    expect(r.source).toBe('https://github.com/vercel-labs/agent-skills');
    expect(r.args).toEqual(
      expect.arrayContaining(['--skill', 'vercel-react-best-practices']),
    );
  });

  it('preserves --skill flag with value', () => {
    const r = parseLine(
      'vercel-labs/agent-skills --skill nextjs-best-practices',
      baseOpts,
    )!;
    expect(r.args).toEqual(
      expect.arrayContaining(['--skill', 'nextjs-best-practices']),
    );
  });

  it('never emits duplicate -y', () => {
    const r = parseLine('foo/bar -y', baseOpts)!;
    const yes = r.args.filter((a) => a === '-y' || a === '--yes');
    expect(yes.length).toBe(1);
  });

  it('returns null when only flags are given', () => {
    expect(parseLine('-y -g', baseOpts)).toBeNull();
  });
});

describe('detectAlreadyInstalled', () => {
  it('detects "already installed"', () => {
    expect(detectAlreadyInstalled('Skill is already installed')).toBe(true);
  });

  it('detects "already exists"', () => {
    expect(detectAlreadyInstalled('Target already exists, skipping')).toBe(true);
  });

  it('detects "skipping"', () => {
    expect(detectAlreadyInstalled('Skipping foo/bar')).toBe(true);
  });

  it('detects "up to date"', () => {
    expect(detectAlreadyInstalled('foo/bar is up to date')).toBe(true);
    expect(detectAlreadyInstalled('up-to-date')).toBe(true);
  });

  it('does not match plain text', () => {
    expect(detectAlreadyInstalled('Installing foo/bar')).toBe(false);
    expect(detectAlreadyInstalled('Resolving dependencies')).toBe(false);
  });
});
