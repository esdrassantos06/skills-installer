import { gunzipSync } from "node:zlib";
import { SkillsApiError } from "./skillsApi";

export type SkillAudit = { name: string; status: string };

export type RelatedSkill = { id: string; name: string; description: string };

export type SkillPageData = {
  name: string | null;
  description: string | null;
  installs: number | null;
  weeklyInstalls: number[];
  installCommand: string | null;
  installsText: string | null;
  stars: string | null;
  firstSeen: string | null;
  topics: string[];
  summary: string[];
  audits: SkillAudit[];
  related: RelatedSkill[];
};

export type RepoInfo = {
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  license: string | null;
  pushedAt: string | null;
  description: string | null;
  homepage: string | null;
  language: string | null;
};

export type SkillDetail = {
  id: string;
  source: string;
  skillId: string;
  url: string;
  repoUrl: string;
  skillMdUrl: string | null;
  skillMd: string | null;
  page: SkillPageData;
  repo: RepoInfo | null;
};

type FetchLike = typeof fetch;

const SITE = "https://www.skills.sh";
const GITHUB_API = "https://api.github.com/repos";
const RAW = "https://raw.githubusercontent.com";
const SKILL_MD_MAX_CHARS = 200_000;
const ARCHIVE_MAX_BYTES = 20_000_000;
const SEGMENT = /^[A-Za-z0-9_][\w.:-]*$/;

/**
 * Splits a GitHub `owner/repo/skill` id or a well-known `domain/skill` id,
 * or returns null for anything else.
 */
export function parseSkillId(
  id: string,
): { source: string; skillId: string; github: boolean } | null {
  const parts = id.split("/");
  if (!parts.every((p) => SEGMENT.test(p))) return null;
  if (parts.length === 3) {
    return {
      source: `${parts[0]}/${parts[1]}`,
      skillId: parts[2],
      github: true,
    };
  }
  if (parts.length === 2 && parts[0].includes(".")) {
    return { source: parts[0], skillId: parts[1], github: false };
  }
  return null;
}

/** Extracts everything skills.sh renders about a skill from its public page HTML. */
export function parseSkillPage(html: string): SkillPageData {
  const app = jsonLd(html).find((o) => o["@type"] === "SoftwareApplication");
  const stat = app?.interactionStatistic as
    { userInteractionCount?: unknown } | undefined;

  const metaDescription = html.match(
    /<meta name="description" content="([^"]*)"/,
  )?.[1];

  const weekly = html.match(/aria-label="Weekly installs: ([\d, ]+)"/)?.[1];

  const header = between(html, "<h1", ">Installation<");
  const summary = between(html, ">Summary<", ">SKILL.md<");
  const related = between(html, ">Related skills<", "</section>");
  const audits = between(html, ">Security Audits<", "</main>");

  return {
    name: typeof app?.name === "string" ? decode(app.name) : null,
    description:
      typeof app?.description === "string"
        ? decode(app.description)
        : metaDescription
          ? decode(metaDescription)
          : null,
    installs:
      typeof stat?.userInteractionCount === "number"
        ? stat.userInteractionCount
        : null,
    weeklyInstalls: weekly
      ? weekly.split(", ").map((n) => Number(n.replace(/,/g, "")))
      : [],
    installCommand:
      text(html.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1] ?? "")
        .replace(/^\$\s*/, "")
        .match(/^npx skills add .+/)?.[0] ?? null,
    installsText: sidebarValue(html, "Installs"),
    stars: sidebarValue(html, "GitHub Stars"),
    firstSeen: sidebarValue(html, "First Seen"),
    topics: [...header.matchAll(/href="\/topic\/[^"]+"[^>]*>([^<]+)</g)].map(
      (m) => decode(m[1]),
    ),
    summary: [...summary.matchAll(/<(p|li)>([\s\S]*?)<\/\1>/g)]
      .map((m) => text(m[2]))
      .filter(Boolean),
    audits: [
      ...audits.matchAll(
        /\/security\/[^"]+"[^>]*>\s*<div[^>]*>\s*<span[^>]*>([^<]+)<\/span>\s*<span[^>]*>([^<]+)<\/span>/g,
      ),
    ].map((m) => ({ name: decode(m[1]), status: decode(m[2]) })),
    related: [
      ...related.matchAll(
        /href="\/([^"/]+\/[^"/]+\/[^"/]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>(?:\s*<p[^>]*>([^<]*)<\/p>)?/g,
      ),
    ]
      .map((m) => ({
        id: m[1].replace(/^site\//, ""),
        name: decode(m[2]),
        description: decode(m[3] ?? ""),
      }))
      .filter((r, i, all) => all.findIndex((o) => o.id === r.id) === i),
  };
}

/** Picks the SKILL.md that belongs to `skillId` from a repo file tree. */
export function findSkillMdPath(
  tree: { path: string }[],
  skillId: string,
): string | null {
  const all = tree.map((t) => t.path).filter((p) => /(^|\/)SKILL\.md$/.test(p));
  return (
    all.find((p) => p === `${skillId}/SKILL.md`) ??
    all.find((p) => p.endsWith(`/${skillId}/SKILL.md`)) ??
    (all.length === 1 ? all[0] : null)
  );
}

/**
 * Loads a skill's full detail. skills.sh is required; GitHub repo stats and
 * SKILL.md are best-effort and come back null when unavailable.
 */
export async function getSkillDetail(
  id: string,
  fetchFn: FetchLike = fetch,
): Promise<SkillDetail> {
  const parsed = parseSkillId(id);
  if (!parsed) throw new SkillsApiError(`Invalid skill id: ${id}`);
  const { source, skillId, github } = parsed;
  const url = github
    ? `${SITE}/${source}/${skillId}`
    : `${SITE}/site/${source}/${skillId}`;

  let res: Response;
  try {
    res = await fetchFn(url, { headers: { Accept: "text/html" } });
  } catch (err) {
    throw new SkillsApiError(`Network error: ${(err as Error).message}`, err);
  }
  if (res.status === 404) {
    throw new SkillsApiError("Skill not found on skills.sh");
  }
  if (!res.ok) throw new SkillsApiError(`HTTP ${res.status}`);
  const page = parseSkillPage(await res.text());

  if (github) {
    const [repo, md] = await Promise.all([
      fetchRepo(source, fetchFn).catch(() => null),
      fetchSkillMd(source, skillId, fetchFn).catch(() => null),
    ]);
    return {
      id,
      source,
      skillId,
      url,
      repoUrl: `https://github.com/${source}`,
      skillMdUrl: md
        ? `https://github.com/${source}/blob/HEAD/${md.path}`
        : null,
      skillMd: md?.content ?? null,
      page,
      repo,
    };
  }

  const installUrl = page.installCommand?.match(
    /^npx skills add (https?:\/\/\S+)/,
  )?.[1];
  const md = installUrl
    ? await fetchWellKnownSkillMd(installUrl, skillId, fetchFn).catch(
        () => null,
      )
    : null;
  return {
    id,
    source,
    skillId,
    url,
    repoUrl: installUrl ?? `https://${source}`,
    skillMdUrl: md?.url ?? null,
    skillMd: md?.content ?? null,
    page,
    repo: null,
  };
}

/**
 * Reads a skill's SKILL.md from a well-known discovery index
 * (`/.well-known/agent-skills/index.json`), the way the skills CLI installs it.
 */
async function fetchWellKnownSkillMd(
  baseUrl: string,
  skillId: string,
  fetchFn: FetchLike,
): Promise<{ url: string | null; content: string } | null> {
  const base = baseUrl.replace(/\/$/, "");
  for (const dir of ["agent-skills", "skills"]) {
    const indexUrl = `${base}/.well-known/${dir}/index.json`;
    const index = await fetchFn(indexUrl)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const entry = (
      index?.skills as Record<string, unknown>[] | undefined
    )?.find((e) => e.name === skillId);
    if (!entry) continue;

    if (Array.isArray(entry.files)) {
      const url = `${base}/.well-known/${dir}/${skillId}/SKILL.md`;
      const r = await fetchFn(url);
      return r.ok ? { url, content: limit(await r.text()) } : null;
    }
    if (typeof entry.url !== "string") return null;
    const url = new URL(entry.url, indexUrl).toString();
    const r = await fetchFn(url);
    if (!r.ok) return null;
    if (entry.type === "skill-md")
      return { url, content: limit(await r.text()) };
    const content = skillMdFromTar(
      gunzipSync(Buffer.from(await r.arrayBuffer()), {
        maxOutputLength: ARCHIVE_MAX_BYTES,
      }),
    );
    return content === null ? null : { url: null, content: limit(content) };
  }
  return null;
}

/** Returns the top-level SKILL.md from an uncompressed tar archive. */
function skillMdFromTar(tar: Buffer): string | null {
  const field = (off: number, len: number) =>
    tar.toString("utf8", off, off + len).replace(/\0[\s\S]*$/, "");
  for (let off = 0; off + 512 <= tar.length;) {
    const name = field(off, 100);
    if (!name) return null;
    const size = parseInt(field(off + 124, 12).trim() || "0", 8);
    if (name.replace(/^\.\//, "") === "SKILL.md") {
      return tar.toString("utf8", off + 512, off + 512 + size);
    }
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return null;
}

function limit(content: string): string {
  return content.slice(0, SKILL_MD_MAX_CHARS);
}

async function fetchRepo(
  source: string,
  fetchFn: FetchLike,
): Promise<RepoInfo> {
  const r = await githubJson<Record<string, unknown>>(
    `${GITHUB_API}/${source}`,
    fetchFn,
  );
  const license = r.license as { spdx_id?: string; name?: string } | null;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    stars: Number(r.stargazers_count) || 0,
    forks: Number(r.forks_count) || 0,
    openIssues: Number(r.open_issues_count) || 0,
    watchers: Number(r.subscribers_count) || 0,
    license:
      license?.spdx_id && license.spdx_id !== "NOASSERTION"
        ? license.spdx_id
        : str(license?.name),
    pushedAt: str(r.pushed_at),
    description: str(r.description),
    homepage: str(r.homepage),
    language: str(r.language),
  };
}

async function fetchSkillMd(
  source: string,
  skillId: string,
  fetchFn: FetchLike,
): Promise<{ path: string; content: string } | null> {
  const { tree } = await githubJson<{ tree: { path: string }[] }>(
    `${GITHUB_API}/${source}/git/trees/HEAD?recursive=1`,
    fetchFn,
  );
  const path = findSkillMdPath(tree ?? [], skillId);
  if (!path) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetchFn(`${RAW}/${source}/HEAD/${encoded}`);
  if (!res.ok) return null;
  return { path, content: (await res.text()).slice(0, SKILL_MD_MAX_CHARS) };
}

async function githubJson<T>(url: string, fetchFn: FetchLike): Promise<T> {
  const res = await fetchFn(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new SkillsApiError(`GitHub HTTP ${res.status}`);
  return (await res.json()) as T;
}

function jsonLd(html: string): Record<string, unknown>[] {
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].flatMap((m) => {
    try {
      return [JSON.parse(m[1])];
    } catch {
      return [];
    }
  });
}

function between(html: string, start: string, end: string): string {
  const i = html.indexOf(start);
  if (i < 0) return "";
  const j = html.indexOf(end, i + start.length);
  return html.slice(i, j < 0 ? undefined : j);
}

function sidebarValue(html: string, label: string): string | null {
  const m = html.match(
    new RegExp(
      `>${label}</(?:span|div)>(?:</div>)?\\s*<div[^>]*>([\\s\\S]*?)</div>`,
    ),
  );
  return m ? text(m[1]) || null : null;
}

function text(fragment: string): string {
  return decode(fragment.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
