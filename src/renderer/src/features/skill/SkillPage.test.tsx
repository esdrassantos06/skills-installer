import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installMockApi, type MockApi } from "../../test/mockApi";
import { SkillPage } from "./SkillPage";
import type { SkillDetail } from "../../../../main/skillDetail";

const DETAIL: SkillDetail = {
  id: "anthropics/skills/frontend-design",
  source: "anthropics/skills",
  skillId: "frontend-design",
  url: "https://www.skills.sh/anthropics/skills/frontend-design",
  repoUrl: "https://github.com/anthropics/skills",
  skillMdUrl:
    "https://github.com/anthropics/skills/blob/HEAD/skills/frontend-design/SKILL.md",
  skillMd: "---\nname: frontend-design\n---\n# Frontend Design\nBody text.",
  page: {
    name: "frontend-design",
    description: "Guidance for distinctive design.",
    installs: 1040984,
    weeklyInstalls: [24029, 22329, 29060],
    installCommand:
      "npx skills add https://github.com/anthropics/skills --skill frontend-design",
    installsText: "1.0M",
    stars: "184.2K",
    firstSeen: "Jan 19, 2026",
    topics: ["Design & UI"],
    summary: ["Distinctive interfaces.", "Guides aesthetic direction"],
    audits: [
      { name: "Socket", status: "Pass" },
      { name: "Snyk", status: "Warn" },
    ],
    related: [
      {
        id: "vercel-labs/agent-skills/web-design-guidelines",
        name: "web-design-guidelines",
        description: "Vercel's Web Interface Guidelines",
      },
    ],
  },
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
};

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

function setDetail(detail: SkillDetail | null, error: string | null = null) {
  vi.mocked(mock.api.skillDetail).mockResolvedValue({ detail, error });
}

describe("SkillPage", () => {
  it("requests the skill by id and renders its identity", async () => {
    setDetail(DETAIL);
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "frontend-design" }),
    ).toBeInTheDocument();
    expect(mock.api.skillDetail).toHaveBeenCalledWith(DETAIL.id);
    expect(
      screen.getByText("Guidance for distinctive design."),
    ).toBeInTheDocument();
    expect(screen.getByText("Design & UI")).toBeInTheDocument();
  });

  it("shows exact install and repository numbers", async () => {
    setDetail(DETAIL);
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    const stats = await screen.findByRole("complementary", { name: "Stats" });
    expect(within(stats).getByText("1,040,984")).toBeInTheDocument();
    expect(within(stats).getByText("184,252")).toBeInTheDocument();
    expect(within(stats).getByText("21,796")).toBeInTheDocument();
    expect(within(stats).getByText("1,444")).toBeInTheDocument();
    expect(within(stats).getByText("MIT")).toBeInTheDocument();
    expect(within(stats).getByText("Jan 19, 2026")).toBeInTheDocument();
    expect(within(stats).getByText("29,060")).toBeInTheDocument();
  });

  it("falls back to the skills.sh star count without GitHub data", async () => {
    setDetail({ ...DETAIL, repo: null });
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);
    const stats = await screen.findByRole("complementary", { name: "Stats" });
    expect(within(stats).getByText("184.2K")).toBeInTheDocument();
  });

  it("shows the skills.sh install label for sources without GitHub", async () => {
    setDetail({
      ...DETAIL,
      repo: null,
      skillMd: null,
      skillMdUrl: null,
      page: { ...DETAIL.page, installs: null, stars: null },
    });
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);
    const stats = await screen.findByRole("complementary", { name: "Stats" });
    expect(within(stats).getByText("1.0M")).toBeInTheDocument();
    expect(within(stats).queryByText("Stars")).not.toBeInTheDocument();
    expect(screen.queryByText("SKILL.md")).not.toBeInTheDocument();
  });

  it("lists audits, summary and the SKILL.md source", async () => {
    setDetail(DETAIL);
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    expect(await screen.findByText("Snyk")).toBeInTheDocument();
    expect(screen.getByText("Warn")).toBeInTheDocument();
    expect(screen.getByText("Guides aesthetic direction")).toBeInTheDocument();
    expect(screen.getByText(/Body text\./)).toBeInTheDocument();
  });

  it("renders SKILL.md as markdown below the page outline", async () => {
    setDetail({
      ...DETAIL,
      skillMd:
        "---\nname: x\n---\n# Title\n\nFirst paragraph.\n\n## Usage\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n`code`",
    });
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    expect(
      await screen.findByRole("heading", { level: 3, name: "Title" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "Usage" }),
    ).toBeInTheDocument();
    expect(screen.getByText("First paragraph.").tagName).toBe("P");
    expect(screen.getByText("one").tagName).toBe("LI");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("code").tagName).toBe("CODE");
    expect(screen.queryByText(/name: x/)).not.toBeInTheDocument();
  });

  it("renders https images and drops relative ones", async () => {
    setDetail({
      ...DETAIL,
      skillMd:
        "![Banner](https://x.test/b.png)\n\n[![Badge](https://x.test/a.svg)](https://x.test)\n\n![Local](./c.png)",
    });
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    expect(await screen.findByRole("img", { name: "Banner" })).toHaveAttribute(
      "src",
      "https://x.test/b.png",
    );
    expect(screen.getByRole("img", { name: "Badge" })).toHaveAttribute(
      "src",
      "https://x.test/a.svg",
    );
    expect(
      screen.queryByRole("img", { name: "Local" }),
    ).not.toBeInTheDocument();
  });

  it("opens SKILL.md links externally and neutralizes in-page anchors", async () => {
    setDetail({
      ...DETAIL,
      skillMd: "[Docs](https://x.test/docs) and [jump](#usage)",
    });
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    const docs = await screen.findByRole("link", { name: "Docs" });
    expect(docs).toHaveAttribute("href", "https://x.test/docs");
    expect(docs).toHaveAttribute("target", "_blank");
    expect(
      screen.queryByRole("link", { name: "jump" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("jump")).toBeInTheDocument();
  });

  it("links out to the repo and skills.sh in the external browser", async () => {
    setDetail(DETAIL);
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    const repo = await screen.findByRole("link", { name: "anthropics/skills" });
    expect(repo).toHaveAttribute("href", DETAIL.repoUrl);
    expect(repo).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /skills\.sh/i })).toHaveAttribute(
      "href",
      DETAIL.url,
    );
  });

  it("links related skills to their own route", async () => {
    setDetail(DETAIL);
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    expect(
      await screen.findByRole("link", { name: /web-design-guidelines/ }),
    ).toHaveAttribute(
      "href",
      "#/skills/vercel-labs/agent-skills/web-design-guidelines",
    );
  });

  it("adds the skill to the installer", async () => {
    setDetail(DETAIL);
    const onAdd = vi.fn();
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={onAdd} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /add to installer/i }),
    );
    expect(onAdd).toHaveBeenCalledWith({
      id: DETAIL.id,
      skillId: "frontend-design",
      name: "frontend-design",
      source: "anthropics/skills",
      installs: 1040984,
    });
  });

  it("goes back", async () => {
    setDetail(DETAIL);
    const onBack = vi.fn();
    render(<SkillPage id={DETAIL.id} onBack={onBack} onAdd={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows the error and retries", async () => {
    setDetail(null, "Skill not found on skills.sh");
    render(<SkillPage id={DETAIL.id} onBack={() => {}} onAdd={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Skill not found on skills.sh",
    );
    setDetail(DETAIL);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "frontend-design" }),
    ).toBeInTheDocument();
    expect(mock.api.skillDetail).toHaveBeenCalledTimes(2);
  });
});
