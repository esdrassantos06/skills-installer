import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useOptimistic,
  useState,
} from "react";
import {
  filterGroups,
  groupByAgent,
  SHARED_KEY,
  type AgentGroup,
  type InstalledSkill,
} from "../../../../main/installedList";
import { ErrorView } from "../search/SearchStates";

type Pick = { name: string; group: AgentGroup };

const pickKey = (groupKey: string, name: string) => `${groupKey}\n${name}`;

function withoutPicks(skills: InstalledSkill[], picks: Pick[]) {
  return skills.map((s) => {
    const gone = picks
      .filter((p) => p.name === s.name)
      .flatMap((p) => p.group.agents);
    return gone.length
      ? { ...s, agents: s.agents.filter((a) => !gone.includes(a)) }
      : s;
  });
}

/** Lists global skills per agent and deletes them, one at a time or in batch. */
export const ManagePage = memo(function ManagePage() {
  const [skills, setSkills] = useState<InstalledSkill[]>([]);
  const [shown, removeOptimistic] = useOptimistic(skills, withoutPicks);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    window.api.listInstalled().then(
      (r) => {
        if (cancelled) return;
        setSkills(r.skills);
        setLoadError(r.error);
        setLoading(false);
      },
      (err: Error) => {
        if (cancelled) return;
        setLoadError(err.message);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  const allGroups = groupByAgent(shown);
  const groups = filterGroups(allGroups, query);
  const searching = query.trim() !== "";

  function remove(picks: Pick[]) {
    setRemoveError(null);
    setSelected((cur) => {
      const next = new Set(cur);
      for (const p of picks) next.delete(pickKey(p.group.key, p.name));
      return next;
    });
    startTransition(async () => {
      removeOptimistic(picks);
      const r = await window.api.removeSkills(
        picks.map((p) => ({ name: p.name, agentIds: p.group.agentIds })),
      );
      if (r.error) setRemoveError(r.error);
      const fresh = r.skills;
      if (fresh) startTransition(() => setSkills(fresh));
    });
  }

  function removeSelected() {
    const picks = allGroups.flatMap((g) =>
      g.skills
        .filter((s) => selected.has(pickKey(g.key, s.name)))
        .map((s) => ({ name: s.name, group: g })),
    );
    remove(picks);
  }

  const groupsWithSelection = new Set(
    [...selected].map((k) => k.slice(0, k.indexOf("\n"))),
  );
  const selectAllKeys = groups
    .filter((g) => groupsWithSelection.has(g.key))
    .flatMap((g) => g.skills.map((s) => pickKey(g.key, s.name)));

  function select(keys: string[], on: boolean) {
    setSelected((cur) => {
      const next = new Set(cur);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }

  const toggleKey = (key: string) =>
    `${searching ? "search" : "browse"}:${key}`;
  const isOpen = (key: string) => toggled.has(toggleKey(key)) !== searching;

  function toggle(key: string) {
    const k = toggleKey(key);
    setToggled((cur) => {
      const next = new Set(cur);
      if (!next.delete(k)) next.add(k);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter installed skills by name or source"
          aria-label="Filter skills"
          className="flex-1 rounded-md border border-border bg-panel px-3 py-2 text-[13px] outline-none placeholder:text-subtle focus:border-accent"
        />
        <button
          onClick={reload}
          disabled={loading}
          className="rounded-md border border-border bg-panel px-2.5 py-2 text-[12px] text-muted transition hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {loading ? "Loading…" : "Reload"}
        </button>
      </header>

      {selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          selectAllCount={selectAllKeys.length}
          onSelectAll={() => select(selectAllKeys, true)}
          onClear={() => setSelected(new Set())}
          onDelete={removeSelected}
        />
      )}

      {removeError && (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-err/40 bg-err/5 px-4 py-2 text-[12px] text-err"
        >
          <span className="flex-1 whitespace-pre-line">{removeError}</span>
          <button
            onClick={() => setRemoveError(null)}
            aria-label="Dismiss error"
            className="text-err/70 hover:text-err"
          >
            ✕
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        {loadError ? (
          <ErrorView error={loadError} />
        ) : groups.length === 0 && !loading ? (
          <div className="mt-12 text-center text-[13px] text-muted">
            {searching ? "No matching skills" : "No global skills installed"}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <AgentSection
                key={g.key}
                group={g}
                open={isOpen(g.key)}
                onToggle={() => toggle(g.key)}
                isSelected={(name) => selected.has(pickKey(g.key, name))}
                onSelect={(name, on) => select([pickKey(g.key, name)], on)}
                onRemove={(name) => remove([{ name, group: g }])}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function SelectionBar({
  count,
  selectAllCount,
  onSelectAll,
  onClear,
  onDelete,
}: {
  count: number;
  selectAllCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const label = `${count} skill${count === 1 ? "" : "s"}`;
  return (
    <div
      role="toolbar"
      aria-label="Selection"
      className="flex items-center gap-2 border-b border-border bg-panel px-4 py-2 text-[12px]"
    >
      <span className="flex-1 text-text">{count} selected</span>
      <button
        onClick={onSelectAll}
        className="rounded-md border border-border px-2.5 py-1 text-muted transition hover:border-accent hover:text-accent"
      >
        Select all ({selectAllCount})
      </button>
      <button
        onClick={onClear}
        className="rounded-md border border-border px-2.5 py-1 text-muted transition hover:text-text"
      >
        Clear
      </button>
      <button
        onClick={() => (confirming ? onDelete() : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        aria-label={
          confirming ? `Confirm delete ${label}` : `Delete selected (${count})`
        }
        className={`rounded-md border px-2.5 py-1 font-medium transition ${
          confirming
            ? "border-err bg-err/10 text-err"
            : "border-border text-muted hover:border-err hover:text-err"
        }`}
      >
        {confirming ? `Delete ${label}?` : `Delete selected (${count})`}
      </button>
    </div>
  );
}

function AgentSection({
  group,
  open,
  onToggle,
  isSelected,
  onSelect,
  onRemove,
}: {
  group: AgentGroup;
  open: boolean;
  onToggle: () => void;
  isSelected: (name: string) => boolean;
  onSelect: (name: string, on: boolean) => void;
  onRemove: (name: string) => void;
}) {
  const id = `agent-${group.key}`;
  const shared = group.key === SHARED_KEY;
  return (
    <section className="rounded-lg border border-border bg-panel">
      <button
        id={`${id}-header`}
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-text"
      >
        <span aria-hidden className="w-3 text-subtle">
          {open ? "▾" : "▸"}
        </span>
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span>{group.label}</span>
          {shared && (
            <span className="truncate text-[11px] font-normal text-muted">
              {group.agents.join(", ")}
            </span>
          )}
        </span>
        <span className="rounded-full bg-panel-2 px-2 py-0.5 font-mono text-[11px] text-muted">
          {group.skills.length}
        </span>
      </button>
      {open && (
        <div
          id={id}
          role="region"
          aria-labelledby={`${id}-header`}
          className="border-t border-border p-2"
        >
          {shared && (
            <p className="px-2 pb-2 text-[11px] text-subtle">
              These agents read the same ~/.agents/skills folder. Deleting here
              removes the skill from all of them.
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {group.skills.map((s) => (
              <SkillItem
                key={s.name}
                skill={s}
                selected={isSelected(s.name)}
                onSelect={(on) => onSelect(s.name, on)}
                onRemove={() => onRemove(s.name)}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SkillItem({
  skill,
  selected,
  onSelect,
  onRemove,
}: {
  skill: InstalledSkill;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-panel-2/40">
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        aria-label={`Select ${skill.name}`}
        className="size-3.5 accent-[var(--color-accent)]"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-text">{skill.name}</div>
        {skill.source && (
          <div className="truncate font-mono text-[11px] text-muted">
            {skill.source}
          </div>
        )}
      </div>
      <button
        onClick={() => (confirming ? onRemove() : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        aria-label={`${confirming ? "Confirm delete" : "Delete"} ${skill.name}`}
        className={`rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition ${
          confirming
            ? "border-err bg-err/10 text-err"
            : "border-border text-muted opacity-0 group-hover:opacity-100 focus:opacity-100 hover:border-err hover:text-err"
        }`}
      >
        {confirming ? "Confirm?" : "Delete"}
      </button>
    </li>
  );
}
