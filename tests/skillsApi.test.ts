import { describe, it, expect, vi } from 'vitest';
import { searchSkills, SkillsApiError } from '../src/main/skillsApi';

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}
function errJson(status: number, body: unknown) {
  return { ok: false, status, json: async () => body } as Response;
}

describe('searchSkills', () => {
  it('throws SkillsApiError on empty query', async () => {
    const fetchFn = vi.fn();
    await expect(searchSkills('', fetchFn as any)).rejects.toBeInstanceOf(
      SkillsApiError,
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('throws on query shorter than 2 characters after trim', async () => {
    const fetchFn = vi.fn();
    await expect(searchSkills('a', fetchFn as any)).rejects.toThrow(/2/);
    await expect(searchSkills('  b  ', fetchFn as any)).rejects.toThrow(/2/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('hits the skills.sh search endpoint with the encoded query', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okJson({ skills: [] }));
    await searchSkills('foo bar', fetchFn as any);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toMatch(/^https:\/\/www\.skills\.sh\/api\/search\?q=/);
    expect(url).toContain('foo%20bar');
  });

  it('parses response into typed Skill[]', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okJson({
        skills: [
          {
            id: 'vercel-labs/agent-skills/vercel-react-best-practices',
            skillId: 'vercel-react-best-practices',
            name: 'vercel-react-best-practices',
            source: 'vercel-labs/agent-skills',
            installs: 409724,
          },
        ],
      }),
    );
    const r = await searchSkills('react', fetchFn as any);
    expect(r.query).toBe('react');
    expect(r.skills).toHaveLength(1);
    expect(r.skills[0]).toMatchObject({
      skillId: 'vercel-react-best-practices',
      source: 'vercel-labs/agent-skills',
      installs: 409724,
    });
  });

  it('drops malformed entries instead of throwing', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okJson({
        skills: [
          {
            id: 'a/b/c',
            skillId: 'c',
            name: 'c',
            source: 'a/b',
            installs: 100,
          },
          { id: 'incomplete' },
          null,
          { id: 'd/e/f', skillId: 'f', name: 'f', source: 'd/e', installs: 0 },
        ],
      }),
    );
    const r = await searchSkills('xy', fetchFn as any);
    expect(r.skills.map((s) => s.skillId)).toEqual(['c', 'f']);
  });

  it('treats missing skills array as empty', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okJson({}));
    const r = await searchSkills('xy', fetchFn as any);
    expect(r.skills).toEqual([]);
  });

  it('surfaces API error message from 4xx body', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(errJson(400, { error: 'Query must be at least 2 characters' }));
    await expect(searchSkills('xy', fetchFn as any)).rejects.toThrow(
      /at least 2 characters/i,
    );
  });

  it('reports status code on 5xx without body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(errJson(503, {}));
    await expect(searchSkills('react', fetchFn as any)).rejects.toThrow(/503/);
  });

  it('wraps network errors in SkillsApiError', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(searchSkills('react', fetchFn as any)).rejects.toBeInstanceOf(
      SkillsApiError,
    );
  });

  it('passes an AbortSignal when given', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okJson({ skills: [] }));
    const ctrl = new AbortController();
    await searchSkills('react', fetchFn as any, { signal: ctrl.signal });
    expect(fetchFn.mock.calls[0][1]).toMatchObject({ signal: ctrl.signal });
  });
});
