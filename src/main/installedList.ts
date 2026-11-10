/** One installed skill, as reported by `skills list --json`. */
export type InstalledSkill = {
  name: string;
  source: string | null;
  agents: string[];
};

/**
 * Skills that one deletion target holds: an agent with its own skills folder,
 * or the Shared group of agents that all read ~/.agents/skills.
 */
export type AgentGroup = {
  key: string;
  label: string;
  agents: string[];
  agentIds: string[];
  skills: InstalledSkill[];
};

/** A request to delete one skill from a set of agents. */
export type Removal = { name: string; agentIds: string[] };

/**
 * Agents the bundled skills CLI points at ~/.agents/skills. They share one
 * copy of each skill, so it can only be deleted from all of them together.
 * A test keeps this in sync with node_modules/skills.
 */
export const UNIVERSAL_AGENTS: ReadonlySet<string> = new Set([
  "Amp",
  "Antigravity",
  "Antigravity CLI",
  "Cline",
  "Codex",
  "Cursor",
  "Deep Agents",
  "Dexto",
  "Droid",
  "Firebender",
  "Gemini CLI",
  "GitHub Copilot",
  "Kilo Code",
  "Kimi Code CLI",
  "Loaf",
  "OpenCode",
  "Pi",
  "PromptScript",
  "Replit",
  "Sarvam Code",
  "Warp",
  "Zed",
  "fx",
]);

/** Group key of the agents that share ~/.agents/skills. */
export const SHARED_KEY = "shared";

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

/** Parses `skills list --json` output, throwing when it is not an array. */
export function parseInstalledList(json: string): InstalledSkill[] {
  const raw: unknown = JSON.parse(json);
  if (!Array.isArray(raw)) throw new Error("Unexpected skills list output");
  return raw.map((s) => ({
    name: String(s.name),
    source: typeof s.source === "string" ? s.source : null,
    agents: Array.isArray(s.agents) ? s.agents.map(String) : [],
  }));
}

/**
 * CLI agent id for a display name, e.g. "Gemini CLI" to "gemini-cli".
 * ponytail: slug heuristic matches every agent the CLI lists today; read the
 * CLI's agent table if a display name ever diverges from its id.
 */
export function agentId(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Groups skills by deletion target: one group per agent with its own folder,
 * sorted by name, then the Shared group. Skills are sorted by name.
 */
export function groupByAgent(skills: InstalledSkill[]): AgentGroup[] {
  const own = new Map<string, InstalledSkill[]>();
  const sharedAgents = new Set<string>();
  const sharedSkills: InstalledSkill[] = [];
  for (const skill of skills) {
    let isShared = false;
    for (const agent of skill.agents) {
      if (UNIVERSAL_AGENTS.has(agent)) {
        sharedAgents.add(agent);
        isShared = true;
      } else {
        own.set(agent, [...(own.get(agent) ?? []), skill]);
      }
    }
    if (isShared) sharedSkills.push(skill);
  }

  const groups: AgentGroup[] = [...own]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([agent, list]) => ({
      key: agentId(agent),
      label: agent,
      agents: [agent],
      agentIds: [agentId(agent)],
      skills: list.sort(byName),
    }));
  if (sharedSkills.length > 0) {
    const agents = [...sharedAgents].sort();
    groups.push({
      key: SHARED_KEY,
      label: "Shared",
      agents,
      agentIds: agents.map(agentId),
      skills: sharedSkills.sort(byName),
    });
  }
  return groups;
}

/** Keeps skills whose name or source contains the query; drops empty groups. */
export function filterGroups(groups: AgentGroup[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      skills: g.skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          !!s.source?.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.skills.length > 0);
}

/** Removals whose skill is still listed for any of their agents. */
export function stillInstalled(
  skills: InstalledSkill[],
  removals: Removal[],
): Removal[] {
  return removals.filter((r) =>
    skills.some(
      (s) =>
        s.name === r.name &&
        s.agents.some((a) => r.agentIds.includes(agentId(a))),
    ),
  );
}

/** Whether the agent ids target agents that read ~/.agents/skills. */
export function isSharedIds(ids: string[]): boolean {
  return ids.some((id) => [...UNIVERSAL_AGENTS].some((a) => agentId(a) === id));
}

/**
 * One CLI call per agent set. Shared copies go last: the CLI keeps a shared
 * folder while another agent (e.g. Claude Code) still links it, so that link
 * must be removed first when both are deleted together.
 */
export function planRemovals(
  removals: Removal[],
): { names: string[]; agentIds: string[] }[] {
  const plans = new Map<string, { names: string[]; agentIds: string[] }>();
  for (const r of removals) {
    const key = r.agentIds.join(" ");
    const plan = plans.get(key) ?? { names: [], agentIds: r.agentIds };
    plan.names.push(r.name);
    plans.set(key, plan);
  }
  return [...plans.values()].sort(
    (a, b) => Number(isSharedIds(a.agentIds)) - Number(isSharedIds(b.agentIds)),
  );
}

/**
 * CLI args removing skills from the given agents, globally or from the
 * project the CLI runs in, rejecting flag-like input.
 */
export function removeArgs(
  names: string[],
  ids: string[],
  global: boolean,
): string[] {
  if (names.length === 0 || ids.length === 0) {
    throw new Error("Nothing to remove");
  }
  for (const name of names) {
    if (!name || name.startsWith("-"))
      throw new Error(`Invalid skill: ${name}`);
  }
  for (const id of ids) {
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(id))
      throw new Error(`Invalid agent: ${id}`);
  }
  return ["remove", ...names, ...(global ? ["-g"] : []), "-a", ...ids, "-y"];
}
