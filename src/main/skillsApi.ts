export type Skill = {
  id: string;
  skillId: string;
  name: string;
  source: string;
  installs: number;
};

export type SearchResult = {
  query: string;
  skills: Skill[];
};

export class SkillsApiError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'SkillsApiError';
  }
}

const ENDPOINT = 'https://www.skills.sh/api/search';
const MIN_QUERY = 2;

type FetchLike = typeof fetch;

export async function searchSkills(
  query: string,
  fetchFn: FetchLike = fetch,
  options: { signal?: AbortSignal } = {},
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY) {
    throw new SkillsApiError(
      `Query must be at least ${MIN_QUERY} characters`,
    );
  }

  const url = `${ENDPOINT}?q=${encodeURIComponent(trimmed)}`;

  let res: Response;
  try {
    res = await fetchFn(url, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
  } catch (err) {
    throw new SkillsApiError(`Network error: ${(err as Error).message}`, err);
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* body unreadable */
    }
    const apiError =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : null;
    throw new SkillsApiError(apiError ?? `HTTP ${res.status}`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    throw new SkillsApiError('Invalid JSON response', err);
  }

  const raw =
    body && typeof body === 'object' && 'skills' in body
      ? (body as { skills: unknown }).skills
      : [];

  const skills = Array.isArray(raw)
    ? raw.filter(isSkill).map(normalizeSkill)
    : [];

  return { query: trimmed, skills };
}

function isSkill(v: unknown): v is Skill {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.skillId === 'string' &&
    typeof o.name === 'string' &&
    typeof o.source === 'string' &&
    typeof o.installs === 'number'
  );
}

function normalizeSkill(s: Skill): Skill {
  return {
    id: s.id,
    skillId: s.skillId,
    name: s.name,
    source: s.source,
    installs: s.installs,
  };
}
