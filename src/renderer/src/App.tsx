import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DoneEvent,
  FinishedEvent,
  LogEvent,
  PlanEvent,
  StartEvent,
} from "../../preload";
import { AgentSelect } from "./AgentSelect";
import { SearchPage } from "./SearchPage";
import { Logo } from "./Logo";
import type { Skill } from "../../../src/main/searchReducer";

type View = "installer" | "search";
const VIEW_KEY = "skills-installer:view";

type Status = "pending" | "running" | "ok" | "err" | "skipped";
type Run = {
  index: number;
  cmd: string;
  source: string;
  status: Status;
  exitCode?: number;
  log: { stream: "out" | "err"; text: string }[];
  expanded: boolean;
};

const INPUT_KEY = "skills-installer:input";
const AGENTS_KEY = "skills-installer:agents";
const REMEMBER_KEY = "skills-installer:remember-agents";
const FORCE_KEY = "skills-installer:force";

const PRESETS: { label: string; hint: string; lines: string[] }[] = [
  {
    label: "Design",
    hint: "frontend, UI/UX",
    lines: [
      "anthropics/skills@frontend-design",
      "vercel-labs/agent-skills@web-design-guidelines",
      "nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max",
      "leonxlnx/taste-skill@design-taste-frontend",
      "arvindrk/extract-design-system@extract-design-system",
      "wshobson/agents@tailwind-design-system",
    ],
  },
  {
    label: "React / Next / RN",
    hint: "web + mobile",
    lines: [
      "vercel-labs/agent-skills@vercel-react-best-practices",
      "vercel-labs/agent-skills@vercel-react-native-skills",
      "callstackincubator/agent-skills@react-native-best-practices",
      "vercel-labs/agent-skills@vercel-react-view-transitions",
      "wshobson/agents@nextjs-app-router-patterns",
    ],
  },
  {
    label: "Backend / TS",
    hint: "Node, Nest, types",
    lines: [
      "wshobson/agents@typescript-advanced-types",
      "dotneet/claude-code-marketplace@typescript-react-reviewer",
      "wshobson/agents@nodejs-backend-patterns",
      "mcollina/skills@node",
      "kadajett/agent-nestjs-skills@nestjs-best-practices",
    ],
  },
  {
    label: "Testing",
    hint: "vitest, e2e, playwright",
    lines: [
      "anthropics/skills@webapp-testing",
      "antfu/skills@vitest",
      "wshobson/agents@javascript-testing-patterns",
      "wshobson/agents@e2e-testing-patterns",
      "currents-dev/playwright-best-practices-skill@playwright-best-practices",
      "supercent-io/skills-template@testing-strategies",
    ],
  },
  {
    label: "Writing",
    hint: "anti-slop, prose",
    lines: [
      "brianlovin/claude-config@deslop",
      "jalaalrd/anti-ai-slop-writing@anti-ai-slop-writing",
      "obra/superpowers@writing-skills",
      "coreyhaines31/marketingskills@copywriting",
      "coreyhaines31/marketingskills@copy-editing",
      "supercent-io/skills-template@technical-writing",
    ],
  },
  {
    label: "Docs",
    hint: "README, API docs, ADRs",
    lines: [
      "anthropics/knowledge-work-plugins@documentation",
      "github/awesome-copilot@documentation-writer",
      "github/awesome-copilot@create-readme",
      "supercent-io/skills-template@api-documentation",
      "addyosmani/agent-skills@documentation-and-adrs",
      "softaworks/agent-toolkit@crafting-effective-readmes",
    ],
  },
  {
    label: "Security",
    hint: "OWASP, auth, audit",
    lines: [
      "supercent-io/skills-template@security-best-practices",
      "hoodini/ai-agents-skills@owasp-security",
      "agamm/claude-code-owasp@owasp-security",
      "better-auth/skills@better-auth-security-best-practices",
      "useai-pro/openclaw-skills-security@skill-vetter",
    ],
  },
  {
    label: "A11y / Review",
    hint: "accessibility, code review",
    lines: [
      "addyosmani/web-quality-skills@accessibility",
      "ibelick/ui-skills@fixing-accessibility",
      "obra/superpowers@requesting-code-review",
      "obra/superpowers@receiving-code-review",
      "wshobson/agents@code-review-excellence",
    ],
  },
];

export default function App() {
  const [agents, setAgents] = useState<string[] | null>(() => {
    const remember = localStorage.getItem(REMEMBER_KEY) === "1";
    if (!remember) return null;
    try {
      const stored = JSON.parse(localStorage.getItem(AGENTS_KEY) ?? "[]");
      return Array.isArray(stored) && stored.length ? stored : null;
    } catch {
      return null;
    }
  });
  const [remember, setRemember] = useState(
    () => localStorage.getItem(REMEMBER_KEY) === "1",
  );

  function confirmAgents(next: string[], rememberNext: boolean) {
    setAgents(next);
    setRemember(rememberNext);
    if (rememberNext) {
      localStorage.setItem(AGENTS_KEY, JSON.stringify(next));
      localStorage.setItem(REMEMBER_KEY, "1");
    } else {
      localStorage.removeItem(AGENTS_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }
  }

  if (!agents) {
    const initial = (() => {
      try {
        const v = JSON.parse(localStorage.getItem(AGENTS_KEY) ?? "[]");
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    })();
    return (
      <AgentSelect
        initial={initial}
        rememberInitial={remember}
        onConfirm={confirmAgents}
      />
    );
  }

  return (
    <Shell
      agents={agents}
      rememberAgents={remember}
      onChangeAgents={() => setAgents(null)}
    />
  );
}

function Shell({
  agents,
  rememberAgents,
  onChangeAgents,
}: {
  agents: string[];
  rememberAgents: boolean;
  onChangeAgents: () => void;
}) {
  const [view, setView] = useState<View>(
    () => (localStorage.getItem(VIEW_KEY) as View) || "installer",
  );
  const [input, setInput] = useState(
    () => localStorage.getItem(INPUT_KEY) ?? "",
  );

  useEffect(() => {
    localStorage.setItem(INPUT_KEY, input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  function appendSkill(skill: Skill) {
    const line = `${skill.source}@${skill.skillId}`;
    setInput((cur) => {
      const existing = new Set(
        cur
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      );
      if (existing.has(line)) return cur;
      const trimmed = cur.trimEnd();
      return (trimmed ? trimmed + "\n" : "") + line + "\n";
    });
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs view={view} onChange={setView} />
      <div className="relative min-h-0 flex-1">
        <div
          className={`absolute inset-0 ${view === "installer" ? "" : "hidden"}`}
          aria-hidden={view !== "installer"}
        >
          <Installer
            agents={agents}
            rememberAgents={rememberAgents}
            onChangeAgents={onChangeAgents}
            input={input}
            setInput={setInput}
          />
        </div>
        <div
          className={`absolute inset-0 ${view === "search" ? "" : "hidden"}`}
          aria-hidden={view !== "search"}
        >
          <SearchPage onAddToInstaller={appendSkill} />
        </div>
      </div>
    </div>
  );
}

function Tabs({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav className="titlebar-drag flex items-center gap-1 border-b border-border bg-bg/80 px-3 pt-2 pb-0 pl-24 backdrop-blur">
      <TabButton
        active={view === "installer"}
        onClick={() => onChange("installer")}
        label="Installer"
      />
      <TabButton
        active={view === "search"}
        onClick={() => onChange("search")}
        label="Search"
      />
    </nav>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`titlebar-nodrag relative -mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-[12px] transition ${
        active
          ? "border-border bg-panel text-text"
          : "border-transparent text-muted hover:text-text"
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-px left-0 right-0 h-px bg-panel" />
      )}
    </button>
  );
}

function Installer({
  agents,
  rememberAgents,
  onChangeAgents,
  input,
  setInput,
}: {
  agents: string[];
  rememberAgents: boolean;
  onChangeAgents: () => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [force, setForce] = useState(
    () => localStorage.getItem(FORCE_KEY) === "1",
  );
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [summary, setSummary] = useState<FinishedEvent | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const runsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<() => void>(() => {});

  useEffect(() => {
    localStorage.setItem(FORCE_KEY, force ? "1" : "0");
  }, [force]);

  useEffect(() => {
    const offs = [
      window.api.onPlan((e: PlanEvent) => {
        setRuns(
          e.commands.map((c, i) => ({
            index: i,
            cmd: c.display,
            source: c.source,
            status: "pending" as Status,
            log: [],
            expanded: false,
          })),
        );
        setAutoFollow(true);
      }),
      window.api.onStart((e: StartEvent) =>
        setRuns((rs) =>
          rs.map((r) =>
            r.index === e.index ? { ...r, cmd: e.cmd, status: "running" } : r,
          ),
        ),
      ),
      window.api.onLog((e: LogEvent) =>
        setRuns((rs) =>
          rs.map((r) =>
            r.index === e.index
              ? { ...r, log: [...r.log, { stream: e.stream, text: e.text }] }
              : r,
          ),
        ),
      ),
      window.api.onDone((e: DoneEvent) =>
        setRuns((rs) =>
          rs.map((r) =>
            r.index === e.index
              ? {
                  ...r,
                  status: e.alreadyInstalled
                    ? "skipped"
                    : e.code === 0
                      ? "ok"
                      : "err",
                  exitCode: e.code,
                  expanded: e.code !== 0 && !e.alreadyInstalled,
                }
              : r,
          ),
        ),
      ),
      window.api.onFinished((e: FinishedEvent) => {
        setSummary(e);
        setRunning(false);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    if (!autoFollow || !runsRef.current) return;
    runsRef.current.scrollTop = runsRef.current.scrollHeight;
  }, [runs, autoFollow]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setAutoFollow(atBottom);
  }

  function scrollToBottom() {
    if (!runsRef.current) return;
    runsRef.current.scrollTo({
      top: runsRef.current.scrollHeight,
      behavior: "smooth",
    });
    setAutoFollow(true);
  }

  const parsedLines = useMemo(
    () =>
      input
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#")),
    [input],
  );

  async function run() {
    if (!parsedLines.length || running) return;
    setRunning(true);
    setRuns([]);
    setSummary(null);
    setAutoFollow(true);
    await window.api.installAll(input.split("\n"), {
      agents,
      global: true,
      force,
    });
  }

  runRef.current = run;

  useEffect(() => {
    function isVisible() {
      return containerRef.current?.offsetParent !== null;
    }
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!isVisible()) return;
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" && (target as HTMLInputElement).type !== "checkbox") {
          return;
        }
        e.preventDefault();
        runRef.current();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function appendPreset(lines: string[]) {
    setInput((cur) => {
      const existing = new Set(
        cur
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      );
      const fresh = lines.filter((l) => !existing.has(l));
      if (!fresh.length) return cur;
      const trimmed = cur.trimEnd();
      return (trimmed ? trimmed + "\n" : "") + fresh.join("\n") + "\n";
    });
  }

  function toggleRun(index: number) {
    setRuns((rs) =>
      rs.map((r) => (r.index === index ? { ...r, expanded: !r.expanded } : r)),
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  }

  const okCount = runs.filter((r) => r.status === "ok").length;
  const errCount = runs.filter((r) => r.status === "err").length;
  const skippedCount = runs.filter((r) => r.status === "skipped").length;
  const doneCount = okCount + errCount + skippedCount;
  const totalRuns = runs.length;
  const progress = totalRuns ? (doneCount / totalRuns) * 100 : 0;

  return (
    <div ref={containerRef} className="bg-canvas flex h-full flex-col">
      <Titlebar
        running={running}
        parsedCount={parsedLines.length}
        summary={summary}
        progress={progress}
        agents={agents}
        rememberAgents={rememberAgents}
        onChangeAgents={onChangeAgents}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(420px,1fr)_minmax(420px,1.2fr)] gap-3 px-3 pb-3">
        <Panel
          title="Commands"
          subtitle="paste owner/repo@skill, one per line"
          right={
            <span className="text-subtle">
              {parsedLines.length}{" "}
              {parsedLines.length === 1 ? "skill" : "skills"}
            </span>
          }
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            placeholder={`vercel-labs/agent-skills@vercel-react-best-practices
anthropics/skills@frontend-design

# lines starting with # are ignored`}
            className="flex-1 resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-[1.65] text-text outline-none placeholder:text-subtle"
          />
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-panel-2/40 px-2.5 py-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => appendPreset(p.lines)}
                title={`${p.hint} · ${p.lines.length} skills`}
                className="group rounded-md border border-border bg-panel px-2 py-1 text-[11px] font-medium text-muted transition hover:border-accent hover:bg-accent-soft hover:text-text"
              >
                <span className="text-subtle group-hover:text-accent">+ </span>
                {p.label}
                <span className="ml-1 text-subtle">{p.lines.length}</span>
              </button>
            ))}
            <button
              onClick={() => setInput("")}
              disabled={running || !input}
              className="ml-auto rounded-md px-2 py-1 text-[11px] text-subtle transition hover:text-err disabled:opacity-30"
            >
              clear
            </button>
          </div>
          <div className="flex items-center gap-3 border-t border-border px-3 py-2.5">
            <button
              onClick={run}
              disabled={running || parsedLines.length === 0}
              className="rounded-md bg-accent px-4 py-1.5 text-[13px] font-semibold text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {running ? (
                <span className="inline-flex items-center gap-2">
                  <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-bg" />
                  Installing
                </span>
              ) : (
                `Install ${parsedLines.length || ""}`.trim()
              )}
            </button>
            <kbd className="rounded border border-border bg-panel px-1.5 py-0.5 text-[10px] text-muted">
              ⌘↵
            </kbd>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                disabled={running}
                className="h-3 w-3 accent-accent"
              />
              force reinstall
            </label>
          </div>
        </Panel>

        <Panel
          title="Execution"
          subtitle={
            running
              ? `${doneCount} of ${totalRuns}`
              : summary
                ? `${summary.ok} ok${summary.skipped ? ` · ${summary.skipped} already installed` : ""}${summary.fail ? ` · ${summary.fail} failed` : ""}`
                : "waiting"
          }
          right={
            totalRuns > 0 ? (
              <div className="flex items-center gap-2 text-[11px]">
                {okCount > 0 && <span className="text-ok">{okCount} ok</span>}
                {skippedCount > 0 && (
                  <span className="text-warn">{skippedCount} skip</span>
                )}
                {errCount > 0 && (
                  <span className="text-err">{errCount} failed</span>
                )}
              </div>
            ) : null
          }
        >
          {totalRuns > 0 && (
            <div className="h-0.5 w-full bg-border">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="relative min-h-0 flex-1">
            <div
              ref={runsRef}
              onScroll={onScroll}
              className="absolute inset-0 overflow-auto px-3 py-3"
            >
              {runs.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="space-y-2">
                  {runs.map((r) => (
                    <RunCard
                      key={r.index}
                      run={r}
                      onToggle={() => toggleRun(r.index)}
                    />
                  ))}
                </ul>
              )}
            </div>
            {!autoFollow && runs.length > 0 && (
              <button
                onClick={scrollToBottom}
                className="absolute right-4 bottom-4 flex items-center gap-1.5 rounded-full border border-border bg-panel/95 px-3 py-1.5 text-[11px] text-text shadow-lg backdrop-blur transition hover:border-accent hover:text-accent"
              >
                ↓ follow
              </button>
            )}
          </div>
        </Panel>
      </main>
    </div>
  );
}

function Titlebar({
  running,
  parsedCount,
  summary,
  progress,
  agents,
  rememberAgents,
  onChangeAgents,
}: {
  running: boolean;
  parsedCount: number;
  summary: FinishedEvent | null;
  progress: number;
  agents: string[];
  rememberAgents: boolean;
  onChangeAgents: () => void;
}) {
  return (
    <header className="titlebar-drag relative flex items-center justify-between border-b border-border px-6 pt-3 pb-3.5 pl-24">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <Logo size={20} className="shrink-0 text-accent" />
          <h1 className="text-[16px] font-semibold tracking-tight">
            Skills Installer
          </h1>
          <span className="text-[11px] text-subtle">for Claude Code</span>
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-muted">
          <span className="text-accent">--global</span> · agents=
          <span className="text-accent">{agents.join(",")}</span>
          {rememberAgents ? (
            <span className="text-subtle"> · saved</span>
          ) : (
            <span className="text-subtle"> · this session</span>
          )}
        </p>
      </div>
      <div className="titlebar-nodrag flex items-center gap-2 text-[11px]">
        <button
          onClick={onChangeAgents}
          className="rounded-md border border-border bg-panel px-2 py-1 text-muted transition hover:border-accent hover:text-text"
        >
          change agents
        </button>
        {running ? (
          <span className="inline-flex items-center gap-1.5 text-accent">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            installing
          </span>
        ) : summary ? (
          <span className={summary.fail ? "text-warn" : "text-ok"}>
            ✓ {summary.ok}
            {summary.skipped ? ` · skip ${summary.skipped}` : ""}
            {summary.fail ? ` · ✗ ${summary.fail}` : ""}
          </span>
        ) : parsedCount > 0 ? (
          <span className="text-muted">{parsedCount} ready</span>
        ) : (
          <span className="text-subtle">idle</span>
        )}
      </div>
      {running && (
        <div className="absolute bottom-0 left-0 h-px w-full bg-border">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </header>
  );
}

function Panel({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {title}
          </span>
          {subtitle && (
            <span className="text-[11px] text-subtle">{subtitle}</span>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function RunCard({ run, onToggle }: { run: Run; onToggle: () => void }) {
  const statusColor =
    run.status === "ok"
      ? "text-ok"
      : run.status === "err"
        ? "text-err"
        : run.status === "skipped"
          ? "text-warn"
          : run.status === "running"
            ? "text-accent"
            : "text-subtle";

  const borderColor =
    run.status === "err"
      ? "border-err/30"
      : run.status === "running"
        ? "border-accent/40"
        : "border-border";

  return (
    <li
      className={`overflow-hidden rounded-lg border ${borderColor} bg-panel-2/40 transition`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-panel-2"
      >
        <StatusIcon status={run.status} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[12.5px] text-text">
            {run.source || run.cmd}
          </div>
          {run.exitCode !== undefined &&
            run.exitCode !== 0 &&
            run.status === "err" && (
              <div className="text-[10.5px] text-err">exit {run.exitCode}</div>
            )}
          {run.status === "skipped" && (
            <div className="text-[10.5px] text-warn">already installed</div>
          )}
        </div>
        <span
          className={`text-[10.5px] uppercase tracking-wider ${statusColor}`}
        >
          {run.status}
        </span>
        <span className="text-subtle text-[11px]">
          {run.expanded ? "−" : "+"}
        </span>
      </button>
      {run.expanded && run.log.length > 0 && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word border-t border-border bg-bg/40 px-3 py-2 font-mono text-[11.5px] leading-[1.55]">
          {run.log.map((l, i) => (
            <span
              key={i}
              className={l.stream === "err" ? "text-err" : "text-text/85"}
            >
              {l.text}
            </span>
          ))}
        </pre>
      )}
    </li>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "running")
    return (
      <span className="pulse-dot inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
    );
  if (status === "ok")
    return <span className="inline-block shrink-0 text-ok">✓</span>;
  if (status === "err")
    return <span className="inline-block shrink-0 text-err">✗</span>;
  if (status === "skipped")
    return <span className="inline-block shrink-0 text-warn">↻</span>;
  return (
    <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-subtle" />
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-subtle">
      <div className="text-[13px] text-muted">No runs yet</div>
      <div className="max-w-xs text-[11.5px]">
        Paste commands and press{" "}
        <kbd className="rounded border border-border bg-panel px-1 py-0.5 text-[10px] text-muted">
          ⌘↵
        </kbd>{" "}
        or click <span className="text-accent">Install</span>.
      </div>
    </div>
  );
}
