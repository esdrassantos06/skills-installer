import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  agentId,
  filterGroups,
  groupByAgent,
  parseInstalledList,
  planRemovals,
  removeArgs,
  stillInstalled,
  UNIVERSAL_AGENTS,
  type InstalledSkill,
} from "../src/main/installedList";

const RAW = JSON.stringify([
  {
    name: "zeta",
    path: "/h/.agents/skills/zeta",
    scope: "global",
    agents: ["Claude Code", "Gemini CLI", "Cursor"],
    source: "acme/tools",
    sourceUrl: "https://github.com/acme/tools.git",
    sourceType: "github",
  },
  {
    name: "alpha",
    path: "/h/.claude/skills/alpha",
    scope: "global",
    agents: ["Claude Code"],
    source: null,
    sourceUrl: null,
    sourceType: null,
  },
]);

const skills: InstalledSkill[] = [
  {
    name: "zeta",
    source: "acme/tools",
    agents: ["Claude Code", "Gemini CLI", "Cursor"],
  },
  { name: "alpha", source: null, agents: ["Claude Code"] },
];

const claude = {
  key: "claude-code",
  label: "Claude Code",
  agents: ["Claude Code"],
  agentIds: ["claude-code"],
  skills: [skills[1], skills[0]],
};
const shared = {
  key: "shared",
  label: "Shared",
  agents: ["Cursor", "Gemini CLI"],
  agentIds: ["cursor", "gemini-cli"],
  skills: [skills[0]],
};

describe("parseInstalledList", () => {
  it("keeps name, source and agents of each skill", () => {
    expect(parseInstalledList(RAW)).toEqual(skills);
  });

  it("throws on output that is not a JSON array", () => {
    expect(() => parseInstalledList('{"x":1}')).toThrow();
    expect(() => parseInstalledList("[{")).toThrow();
  });
});

describe("agentId", () => {
  it("turns CLI display names into agent ids", () => {
    expect(agentId("Claude Code")).toBe("claude-code");
    expect(agentId("Gemini CLI")).toBe("gemini-cli");
    expect(agentId("GitHub Copilot")).toBe("github-copilot");
    expect(agentId("Cursor")).toBe("cursor");
  });
});

describe("UNIVERSAL_AGENTS", () => {
  it("matches the agents the bundled skills CLI points at ~/.agents/skills", () => {
    const cli = readFileSync("node_modules/skills/dist/cli.mjs", "utf8");
    const re = /displayName: "([^"]+)",\n\t\tskillsDir: "\.agents\/skills"/g;
    const fromCli = [...cli.matchAll(re)]
      .map((m) => m[1])
      .filter((name) => name !== "Universal");
    expect([...UNIVERSAL_AGENTS].sort()).toEqual(fromCli.sort());
  });
});

describe("groupByAgent", () => {
  it("gives agents with their own folder a group, and puts agents sharing ~/.agents/skills in one Shared group last", () => {
    expect(groupByAgent(skills)).toEqual([claude, shared]);
  });
});

describe("filterGroups", () => {
  const groups = groupByAgent(skills);

  it("returns every group for a blank query", () => {
    expect(filterGroups(groups, "  ")).toBe(groups);
  });

  it("matches skill name or source, case-insensitively, dropping empty groups", () => {
    expect(filterGroups(groups, "ALP")).toEqual([
      { ...claude, skills: [skills[1]] },
    ]);
    expect(filterGroups(groups, "acme")).toEqual([
      { ...claude, skills: [skills[0]] },
      shared,
    ]);
    expect(filterGroups(groups, "nothing")).toEqual([]);
  });
});

describe("stillInstalled", () => {
  it("returns the removals whose skill is still listed for any of their agents", () => {
    expect(
      stillInstalled(skills, [
        { name: "zeta", agentIds: ["cursor", "gemini-cli"] },
        { name: "alpha", agentIds: ["cursor"] },
        { name: "gone", agentIds: ["claude-code"] },
      ]),
    ).toEqual([{ name: "zeta", agentIds: ["cursor", "gemini-cli"] }]);
  });
});

describe("planRemovals", () => {
  it("batches names per agent set and removes shared copies last", () => {
    expect(
      planRemovals([
        { name: "a", agentIds: ["cursor", "gemini-cli"] },
        { name: "b", agentIds: ["claude-code"] },
        { name: "c", agentIds: ["cursor", "gemini-cli"] },
        { name: "a", agentIds: ["claude-code"] },
      ]),
    ).toEqual([
      { names: ["b", "a"], agentIds: ["claude-code"] },
      { names: ["a", "c"], agentIds: ["cursor", "gemini-cli"] },
    ]);
  });
});

describe("removeArgs", () => {
  it("builds a global, non-interactive removal for the given agents", () => {
    expect(
      removeArgs(["my-skill", "other"], ["cursor", "codex"], true),
    ).toEqual([
      "remove",
      "my-skill",
      "other",
      "-g",
      "-a",
      "cursor",
      "codex",
      "-y",
    ]);
  });

  it("drops -g for a project removal", () => {
    expect(removeArgs(["x"], ["claude-code"], false)).toEqual([
      "remove",
      "x",
      "-a",
      "claude-code",
      "-y",
    ]);
  });

  it("rejects an empty removal", () => {
    expect(() => removeArgs([], ["claude-code"], true)).toThrow();
    expect(() => removeArgs(["x"], [], true)).toThrow();
  });

  it("rejects names and agents that could be read as flags", () => {
    expect(() => removeArgs(["ok", "--all"], ["claude-code"], true)).toThrow();
    expect(() => removeArgs(["x"], ["-g"], true)).toThrow();
    expect(() => removeArgs([""], ["claude-code"], true)).toThrow();
    expect(() => removeArgs(["x"], ["Claude Code"], true)).toThrow();
  });

  it("allows names with spaces, since no shell is involved", () => {
    expect(removeArgs(["SVG Logo Designer"], ["cursor"], true)[1]).toBe(
      "SVG Logo Designer",
    );
  });
});
