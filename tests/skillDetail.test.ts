import { describe, it, expect, vi } from "vitest";
import { gzipSync } from "node:zlib";
import {
  findSkillMdPath,
  getSkillDetail,
  parseSkillId,
  parseSkillPage,
} from "../src/main/skillDetail";
import { SkillsApiError } from "../src/main/skillsApi";

const PAGE = `<!DOCTYPE html><html><head>
<title>frontend-design — anthropics/skills</title>
<meta name="description" content="Short meta description…"/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"frontend-design","description":"Guidance for distinctive design. Don&#x27;t ship templates.","interactionStatistic":{"@type":"InteractionCounter","userInteractionCount":1040984}}</script>
<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[]}</script>
</head><body><main>
<h1 class="text-4xl">frontend-design</h1><div class="flex"><a class="chip" href="/topic/design">Design &amp; UI</a><a class="chip" href="/topic/react">React</a></div>
<div><span>Installation</span></div><code class="truncate"><span class="opacity-50">$</span> <!-- -->npx skills add https://github.com/anthropics/skills --skill frontend-design</code>
<div class="uppercase">Summary</div><div><div><p><strong>Distinctive interfaces.</strong></p>
<ul>
<li>Guides aesthetic direction</li>
<li>Avoids clichéd <code>fonts</code></li>
</ul></div></div>
<div><span>SKILL.md</span></div><div class="prose"><h1>Frontend Design</h1></div>
<section class="mt-16"><div>Related skills</div><div><h2>More in <a href="/topic/design">Design &amp; UI</a></h2><ul><li><a class="grid" href="/vercel-labs/agent-skills/web-design-guidelines"><div class="min-w-0"><h3 class="font-mono">web-design-guidelines</h3><p class="text-xs">Vercel&#x27;s Web Interface Guidelines</p></div><div>vercel-labs<!-- -->/<!-- -->agent-skills</div></a></li></ul></div></section>
<div class="bg-background pb-8"><div><span>Installs</span></div><div class="text-3xl">1.0M</div><svg viewBox="0 0 160 48" role="img" aria-label="Weekly installs: 24,029, 22,329, 29,060"></svg></div>
<div class="bg-background py-8"><div><span>Repository</span></div><a href="https://github.com/anthropics/skills">anthropics/skills</a></div>
<div class="bg-background py-8"><div><span>GitHub Stars</span></div><div><svg><path d="m8"/></svg><span>184.2K</span></div></div>
<div class="bg-background py-8"><div><span>First Seen</span></div><div class="text-sm">Jan 19, 2026</div></div>
<div class="bg-background py-8"><div>Security Audits</div><div class="divide-y"><a href="/anthropics/skills/frontend-design/security/agent-trust-hub"><div><span class="a">Gen Agent Trust Hub</span><span class="b">Pass</span></div></a><a href="/anthropics/skills/frontend-design/security/snyk"><div><span class="a">Snyk</span><span class="b">Warn</span></div></a></div></div>
</main><script>self.__next_f.push([1,"href=\\"/topic/ghost\\""])</script></body></html>`;

function res(status: number, body: string | object | Buffer) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => (typeof body === "string" ? JSON.parse(body) : body),
    arrayBuffer: async () => body as Buffer,
  } as unknown as Response;
}

function tar(files: Record<string, string>): Buffer {
  const blocks = Object.entries(files).flatMap(([name, content]) => {
    const data = Buffer.from(content);
    const header = Buffer.alloc(512);
    header.write(name, 0);
    header.write(data.length.toString(8).padStart(11, "0"), 124);
    const body = Buffer.alloc(Math.ceil(data.length / 512) * 512);
    data.copy(body);
    return [header, body];
  });
  return Buffer.concat([...blocks, Buffer.alloc(1024)]);
}

const REPO = {
  stargazers_count: 184252,
  forks_count: 21796,
  open_issues_count: 1444,
  subscribers_count: 1122,
  license: { spdx_id: "MIT", name: "MIT License" },
  pushed_at: "2026-10-09T18:45:52Z",
  description: "Public repository for Agent Skills",
  homepage: "",
  language: "Python",
  default_branch: "main",
};

const TREE = {
  tree: [
    { path: "README.md", type: "blob" },
    { path: "skills/canvas-design/SKILL.md", type: "blob" },
    { path: "skills/frontend-design/SKILL.md", type: "blob" },
  ],
};

function routedFetch(routes: Record<string, Response | Error>) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    const r = routes[key];
    if (r instanceof Error) throw r;
    return r;
  });
}

describe("parseSkillId", () => {
  it("splits owner/repo/skill", () => {
    expect(parseSkillId("anthropics/skills/frontend-design")).toEqual({
      source: "anthropics/skills",
      skillId: "frontend-design",
      github: true,
    });
  });

  it("splits domain/skill for well-known sources", () => {
    expect(parseSkillId("open.feishu.cn/lark-mail")).toEqual({
      source: "open.feishu.cn",
      skillId: "lark-mail",
      github: false,
    });
  });

  it("rejects malformed ids", () => {
    for (const bad of [
      "",
      "a/b",
      "localhost/x",
      "a/b/c/d",
      "a/../c",
      "a/b/c?x=1",
      "a/b/c#x",
      "a b/c/d",
    ]) {
      expect(parseSkillId(bad)).toBeNull();
    }
  });
});

describe("parseSkillPage", () => {
  const page = parseSkillPage(PAGE);

  it("reads name, description and exact installs from JSON-LD", () => {
    expect(page.name).toBe("frontend-design");
    expect(page.description).toBe(
      "Guidance for distinctive design. Don't ship templates.",
    );
    expect(page.installs).toBe(1040984);
  });

  it("reads the weekly installs series", () => {
    expect(page.weeklyInstalls).toEqual([24029, 22329, 29060]);
  });

  it("reads the install command shown on the page", () => {
    expect(page.installCommand).toBe(
      "npx skills add https://github.com/anthropics/skills --skill frontend-design",
    );
  });

  it("reads sidebar facts", () => {
    expect(page.stars).toBe("184.2K");
    expect(page.installsText).toBe("1.0M");
    expect(page.firstSeen).toBe("Jan 19, 2026");
  });

  it("reads topics from the header only", () => {
    expect(page.topics).toEqual(["Design & UI", "React"]);
  });

  it("reads summary lead and bullets as plain text", () => {
    expect(page.summary).toEqual([
      "Distinctive interfaces.",
      "Guides aesthetic direction",
      "Avoids clichéd fonts",
    ]);
  });

  it("reads security audits", () => {
    expect(page.audits).toEqual([
      { name: "Gen Agent Trust Hub", status: "Pass" },
      { name: "Snyk", status: "Warn" },
    ]);
  });

  it("reads related skills", () => {
    expect(page.related).toEqual([
      {
        id: "vercel-labs/agent-skills/web-design-guidelines",
        name: "web-design-guidelines",
        description: "Vercel's Web Interface Guidelines",
      },
    ]);
  });

  it("drops duplicate related skills", () => {
    const dup = PAGE.replace(
      "</ul></div></section>",
      `<li><a href="/vercel-labs/agent-skills/web-design-guidelines"><div><h3>web-design-guidelines</h3><p>again</p></div></a></li></ul></div></section>`,
    );
    expect(parseSkillPage(dup).related).toHaveLength(1);
  });

  it("falls back to empty values on unrelated HTML", () => {
    const empty = parseSkillPage("<html><body>nothing</body></html>");
    expect(empty).toMatchObject({
      name: null,
      description: null,
      installs: null,
      weeklyInstalls: [],
      installCommand: null,
      installsText: null,
      stars: null,
      firstSeen: null,
      topics: [],
      summary: [],
      audits: [],
      related: [],
    });
  });

  it("reads sidebar labels rendered as divs on domain-source pages", () => {
    const p = parseSkillPage(
      `<div class="a"><div class="b">Installs</div><div class="c">818.1K</div><svg aria-label="Weekly installs: 1, 2"></svg></div>`,
    );
    expect(p.installsText).toBe("818.1K");
  });

  it("uses the meta description when JSON-LD is missing", () => {
    const p = parseSkillPage(
      `<meta name="description" content="From meta &amp; tags"/>`,
    );
    expect(p.description).toBe("From meta & tags");
  });
});

describe("findSkillMdPath", () => {
  it("prefers the folder named after the skill", () => {
    expect(findSkillMdPath(TREE.tree, "frontend-design")).toBe(
      "skills/frontend-design/SKILL.md",
    );
  });

  it("falls back to the only SKILL.md in the repo", () => {
    expect(findSkillMdPath([{ path: "SKILL.md" }], "anything")).toBe(
      "SKILL.md",
    );
  });

  it("returns null when ambiguous or missing", () => {
    expect(findSkillMdPath(TREE.tree, "nope")).toBeNull();
    expect(findSkillMdPath([], "x")).toBeNull();
  });
});

describe("getSkillDetail", () => {
  const ID = "anthropics/skills/frontend-design";

  it("rejects invalid ids without fetching", async () => {
    const fetchFn = vi.fn();
    await expect(getSkillDetail("../x", fetchFn as any)).rejects.toBeInstanceOf(
      SkillsApiError,
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("combines skills.sh, GitHub repo and SKILL.md", async () => {
    const fetchFn = routedFetch({
      "https://www.skills.sh/anthropics/skills/frontend-design": res(200, PAGE),
      "https://api.github.com/repos/anthropics/skills/git/trees/": res(
        200,
        TREE,
      ),
      "https://api.github.com/repos/anthropics/skills": res(200, REPO),
      "https://raw.githubusercontent.com/anthropics/skills/HEAD/skills/frontend-design/SKILL.md":
        res(200, "---\nname: frontend-design\n---\n# Frontend Design"),
    });

    const d = await getSkillDetail(ID, fetchFn as any);

    expect(d).toMatchObject({
      id: ID,
      source: "anthropics/skills",
      skillId: "frontend-design",
      url: "https://www.skills.sh/anthropics/skills/frontend-design",
      repoUrl: "https://github.com/anthropics/skills",
      skillMdUrl:
        "https://github.com/anthropics/skills/blob/HEAD/skills/frontend-design/SKILL.md",
      skillMd: "---\nname: frontend-design\n---\n# Frontend Design",
      repo: {
        stars: 184252,
        forks: 21796,
        openIssues: 1444,
        watchers: 1122,
        license: "MIT",
        pushedAt: "2026-10-09T18:45:52Z",
        description: "Public repository for Agent Skills",
        homepage: null,
        language: "Python",
      },
    });
    expect(d.page.installs).toBe(1040984);
  });

  const domainPage = (url: string) =>
    PAGE.replace(
      "npx skills add https://github.com/anthropics/skills --skill frontend-design",
      `npx skills add ${url}`,
    );

  it("loads domain sources from the /site page without touching GitHub", async () => {
    const fetchFn = routedFetch({
      "https://www.skills.sh/site/uizze.sh/ui-taste": res(
        200,
        domainPage("https://uizze.sh/"),
      ),
      "https://uizze.sh/.well-known/": res(404, ""),
    });
    const d = await getSkillDetail("uizze.sh/ui-taste", fetchFn as any);
    expect(d).toMatchObject({
      source: "uizze.sh",
      skillId: "ui-taste",
      url: "https://www.skills.sh/site/uizze.sh/ui-taste",
      repoUrl: "https://uizze.sh/",
      repo: null,
      skillMd: null,
      skillMdUrl: null,
    });
    expect(fetchFn.mock.calls.some(([u]) => String(u).includes("github"))).toBe(
      false,
    );
  });

  it("reads SKILL.md from a v1 well-known index", async () => {
    const fetchFn = routedFetch({
      "https://www.skills.sh/": res(200, domainPage("https://uizze.sh/")),
      "https://uizze.sh/.well-known/agent-skills/index.json": res(200, {
        skills: [{ name: "ui-taste", description: "x", files: ["SKILL.md"] }],
      }),
      "https://uizze.sh/.well-known/agent-skills/ui-taste/SKILL.md": res(
        200,
        "# UI Taste",
      ),
    });
    const d = await getSkillDetail("uizze.sh/ui-taste", fetchFn as any);
    expect(d.skillMd).toBe("# UI Taste");
    expect(d.skillMdUrl).toBe(
      "https://uizze.sh/.well-known/agent-skills/ui-taste/SKILL.md",
    );
  });

  it("reads SKILL.md out of a v2 archive entry", async () => {
    const base = "https://open.feishu.cn/lark-cli/skills/regular";
    const fetchFn = routedFetch({
      "https://www.skills.sh/": res(200, domainPage(base)),
      [`${base}/.well-known/agent-skills/index.json`]: res(200, {
        $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
        skills: [
          {
            name: "lark-mail",
            description: "x",
            type: "archive",
            url: "./lark-mail.tar.gz",
            digest: "sha256:0",
          },
        ],
      }),
      [`${base}/.well-known/agent-skills/lark-mail.tar.gz`]: res(
        200,
        gzipSync(tar({ "references/a.md": "ref", "SKILL.md": "# Lark Mail" })),
      ),
    });
    const d = await getSkillDetail("open.feishu.cn/lark-mail", fetchFn as any);
    expect(d.skillMd).toBe("# Lark Mail");
    expect(d.repoUrl).toBe(base);
  });

  it("keeps skills.sh data when GitHub fails", async () => {
    const fetchFn = routedFetch({
      "https://www.skills.sh/": res(200, PAGE),
      "https://api.github.com/": res(403, { message: "rate limited" }),
    });
    const d = await getSkillDetail(ID, fetchFn as any);
    expect(d.repo).toBeNull();
    expect(d.skillMd).toBeNull();
    expect(d.page.stars).toBe("184.2K");
  });

  it("throws a not-found error when skills.sh has no such skill", async () => {
    const fetchFn = routedFetch({ "https://www.skills.sh/": res(404, "") });
    await expect(getSkillDetail(ID, fetchFn as any)).rejects.toThrow(
      /not found/i,
    );
  });

  it("wraps network failures", async () => {
    const fetchFn = routedFetch({
      "https://www.skills.sh/": new Error("ECONNRESET"),
    });
    await expect(getSkillDetail(ID, fetchFn as any)).rejects.toThrow(
      /Network error: ECONNRESET/,
    );
  });
});
