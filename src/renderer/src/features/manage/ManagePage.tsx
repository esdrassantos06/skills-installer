import {
  memo,
  type ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import {
  groupByAgent,
  SHARED_KEY,
  type AgentGroup,
  type InstalledSkill,
} from "../../../../main/installedList";
import {
  addProject,
  folderName,
  pickFolder,
  removeProject,
  useProjects,
} from "../../lib/projectFolder";
import {
  focusShortcutLabel,
  useFocusShortcut,
} from "../../lib/useFocusShortcut";

/** One deletable row: a skill as one agent group sees it, in one location. */
type Item = {
  key: string;
  dir: string | null;
  name: string;
  source: string | null;
  group: AgentGroup;
  tag?: string;
};

/** An accordion: an agent group (Global tab) or a project folder (Project tab). */
type Section = {
  key: string;
  title: string;
  path?: string;
  chips?: string[];
  note?: string;
  items: Item[];
  error?: string | null;
  onDiscard?: () => void;
};

type SkillsByDir = Record<string, InstalledSkill[]>;

const GLOBAL = "~";
const dirKey = (dir: string | null) => dir ?? GLOBAL;
const sectionOf = (itemKey: string) => itemKey.slice(0, itemKey.indexOf("\n"));

function withoutItems(state: SkillsByDir, items: Item[]): SkillsByDir {
  const next = { ...state };
  for (const it of items) {
    const k = dirKey(it.dir);
    next[k] = (next[k] ?? []).map((s) =>
      s.name === it.name
        ? { ...s, agents: s.agents.filter((a) => !it.group.agents.includes(a)) }
        : s,
    );
  }
  return next;
}

function matches(item: Item, q: string) {
  return (
    item.name.toLowerCase().includes(q) ||
    !!item.source?.toLowerCase().includes(q)
  );
}

function itemsOf(
  sectionKey: string,
  dir: string | null,
  group: AgentGroup,
  tagged: boolean,
): Item[] {
  return group.skills.map((s) => ({
    key: `${sectionKey}\n${group.key}\n${s.name}`,
    dir,
    name: s.name,
    source: s.source,
    group,
    tag: tagged ? group.label : undefined,
  }));
}

function globalSections(skills: InstalledSkill[]): Section[] {
  return groupByAgent(skills).map((g) => {
    const shared = g.key === SHARED_KEY;
    return {
      key: g.key,
      title: g.label,
      chips: shared ? g.agents : undefined,
      path: shared ? "~/.agents/skills" : undefined,
      note: shared
        ? "These agents read one shared folder. Deleting here removes the skill from all of them."
        : undefined,
      items: itemsOf(g.key, null, g, false),
    };
  });
}

function projectSections(
  projects: string[],
  byDir: SkillsByDir,
  errors: Record<string, string | null>,
): Section[] {
  return projects.map((dir) => ({
    key: dir,
    title: folderName(dir),
    path: dir,
    items: groupByAgent(byDir[dir] ?? [])
      .flatMap((g) => itemsOf(dir, dir, g, true))
      .sort((a, b) => a.name.localeCompare(b.name)),
    error: errors[dir] ?? null,
    onDiscard: () => removeProject(dir),
  }));
}

type Scope = "global" | "project";

const SCOPES: { id: Scope; label: string; flag: string }[] = [
  { id: "global", label: "Global", flag: "-g" },
  { id: "project", label: "Project", flag: "./" },
];

async function addFolder() {
  const folder = await pickFolder();
  if (folder) addProject(folder);
}

/** Global and Project tabs over the installed skills manager. */
export const ManagePage = memo(function ManagePage() {
  const [scope, setScope] = useState<Scope>("global");
  const projects = useProjects();

  return (
    <div className="bg-canvas flex h-full flex-col">
      <div className="flex items-end justify-between gap-4 border-b border-border px-5 pt-3">
        <div role="tablist" aria-label="Scope" className="flex items-end gap-5">
          {SCOPES.map((s) => {
            const active = scope === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => setScope(s.id)}
                className={`group relative -mb-px flex items-baseline gap-2 border-b pb-2.5 text-[13px] font-medium transition ${
                  active
                    ? "border-accent text-text"
                    : "border-transparent text-muted hover:text-text"
                }`}
              >
                {s.label}
                <span
                  aria-hidden
                  className={`font-mono text-[10.5px] font-normal ${active ? "text-accent" : "text-subtle"}`}
                >
                  {s.flag}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 items-center gap-2 pb-2 text-[11px] text-subtle">
          {scope === "global" ? (
            <span className="font-mono">
              scope=<span className="text-muted">~</span>
            </span>
          ) : (
            projects.length > 0 && <AddFolderButton />
          )}
        </div>
      </div>
      {scope === "global" ? (
        <SkillsManager key="global" dirs={[null]} />
      ) : projects.length > 0 ? (
        <SkillsManager key="project" dirs={projects} />
      ) : (
        <EmptyState
          title="No projects yet"
          hint="Add a project folder to see and delete its skills."
          action={<AddFolderButton />}
        />
      )}
    </div>
  );
});

function AddFolderButton() {
  return (
    <button
      onClick={() => void addFolder()}
      className="shrink-0 rounded-md border border-dashed border-border-strong px-2.5 py-1 text-[11.5px] text-muted transition hover:border-accent hover:text-accent"
    >
      Add Folder
    </button>
  );
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="rise flex flex-1 flex-col items-center justify-center gap-1.5 pb-16 text-center">
      <span
        aria-hidden
        className="mb-1 font-mono text-[18px] text-border-strong"
      >
        [ ]
      </span>
      <span className="text-[13px] text-muted">{title}</span>
      <span className="text-[11.5px] text-subtle">{hint}</span>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/**
 * Lists the skills of each location in `dirs` (null is global) and deletes
 * them one at a time or in batch. A single global location is shown per
 * agent group; project folders are shown one section per folder.
 */
function SkillsManager({ dirs }: { dirs: (string | null)[] }) {
  const isGlobal = dirs.length === 1 && dirs[0] === null;
  const [byDir, setByDir] = useState<SkillsByDir>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [shown, removeOptimistic] = useOptimistic(byDir, withoutItems);
  const [reloading, setReloading] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const dirsKey = JSON.stringify(dirs);
  const filterRef = useRef<HTMLInputElement>(null);
  useFocusShortcut(filterRef);

  useEffect(() => {
    let cancelled = false;
    const list: (string | null)[] = JSON.parse(dirsKey);
    Promise.all(
      list.map((dir) =>
        window.api.listInstalled(dir).then(
          (r) => ({ dir, skills: r.skills, error: r.error }),
          (err: Error) => ({ dir, skills: [], error: err.message }),
        ),
      ),
    ).then((results) => {
      if (cancelled) return;
      setByDir((cur) => {
        const next = { ...cur };
        for (const r of results) next[dirKey(r.dir)] = r.skills;
        return next;
      });
      setErrors((cur) => {
        const next = { ...cur };
        for (const r of results) next[dirKey(r.dir)] = r.error;
        return next;
      });
      setReloading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, dirsKey]);

  const loading = reloading || dirs.some((d) => !(dirKey(d) in byDir));

  const reload = useCallback(() => {
    setReloading(true);
    setAttempt((n) => n + 1);
  }, []);

  const q = query.trim().toLowerCase();
  const searching = q !== "";
  const allSections = isGlobal
    ? globalSections(shown[GLOBAL] ?? [])
    : projectSections(dirs as string[], shown, errors);
  const sections = searching
    ? allSections
        .map((s) => ({ ...s, items: s.items.filter((i) => matches(i, q)) }))
        .filter((s) => s.items.length > 0)
    : allSections;
  const allItems = allSections.flatMap((s) => s.items);

  function remove(items: Item[]) {
    setRemoveError(null);
    setSelected((cur) => {
      const next = new Set(cur);
      for (const it of items) next.delete(it.key);
      return next;
    });
    startTransition(async () => {
      removeOptimistic(items);
      const perDir = new Map<string | null, Item[]>();
      for (const it of items) {
        perDir.set(it.dir, [...(perDir.get(it.dir) ?? []), it]);
      }
      const failures: string[] = [];
      for (const [dir, list] of perDir) {
        const r = await window.api.removeSkills(
          list.map((it) => ({ name: it.name, agentIds: it.group.agentIds })),
          dir,
        );
        if (r.error) {
          failures.push(
            perDir.size > 1 && dir ? `${folderName(dir)}: ${r.error}` : r.error,
          );
        }
        const fresh = r.skills;
        if (fresh) {
          startTransition(() =>
            setByDir((cur) => ({ ...cur, [dirKey(dir)]: fresh })),
          );
        }
      }
      if (failures.length) setRemoveError(failures.join("\n"));
    });
  }

  const sectionsWithSelection = new Set([...selected].map(sectionOf));
  const selectAllKeys = sections
    .filter((s) => sectionsWithSelection.has(s.key))
    .flatMap((s) => s.items.map((i) => i.key));

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

  const summary = isGlobal
    ? `${new Set(allItems.map((i) => i.name)).size} skills · ${allSections.length} groups`
    : `${allSections.length} project${allSections.length === 1 ? "" : "s"} · ${allItems.length} skills`;
  const globalError = isGlobal ? errors[GLOBAL] : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 px-5 py-3">
        <div className="relative flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle"
          >
            ⌕
          </span>
          <input
            ref={filterRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter by name or source"
            aria-label="Filter skills"
            className="w-full rounded-lg border border-border bg-panel py-2 pr-14 pl-8 text-[12.5px] outline-none transition placeholder:text-subtle focus:border-accent"
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-subtle"
          >
            {focusShortcutLabel}
          </kbd>
        </div>
        <span className="hidden font-mono text-[11px] text-subtle tabular-nums sm:inline">
          {loading ? "listing…" : summary}
        </span>
        <button
          onClick={reload}
          disabled={loading}
          className="rounded-lg border border-border bg-panel px-2.5 py-2 text-[11.5px] text-muted transition hover:border-accent hover:text-accent disabled:opacity-40"
        >
          <span aria-hidden className={loading ? "spin inline-block" : ""}>
            ↻
          </span>{" "}
          {loading ? "Loading…" : "Reload"}
        </button>
      </header>

      {(removeError || globalError) && (
        <div
          role="alert"
          className="rise mx-5 mb-2 flex items-start gap-3 rounded-lg border border-err/40 bg-err/5 px-3 py-2 text-[12px] text-err"
        >
          <span aria-hidden className="font-mono">
            ✗
          </span>
          <span className="flex-1 whitespace-pre-line">
            {removeError ?? globalError}
          </span>
          {removeError && (
            <button
              onClick={() => setRemoveError(null)}
              aria-label="Dismiss error"
              className="text-err/60 transition hover:text-err"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div
        className={`min-h-0 flex-1 overflow-auto px-5 pt-1 ${selected.size > 0 ? "pb-24" : "pb-5"}`}
      >
        {sections.length === 0 && !loading && !globalError ? (
          <EmptyState
            title={
              searching ? "No matching skills" : "No global skills installed"
            }
            hint={
              searching
                ? "Try another name or source."
                : "Install some from the Installer or Search tab."
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {sections.map((s) => (
              <SectionView
                key={s.key}
                section={s}
                open={isOpen(s.key)}
                onToggle={() => toggle(s.key)}
                isSelected={(key) => selected.has(key)}
                onSelect={(key, on) => select([key], on)}
                onRemove={(item) => remove([item])}
              />
            ))}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          selectAllCount={selectAllKeys.length}
          onSelectAll={() => select(selectAllKeys, true)}
          onClear={() => setSelected(new Set())}
          onDelete={() => remove(allItems.filter((i) => selected.has(i.key)))}
        />
      )}
    </div>
  );
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA") return true;
  return (
    target.tagName === "INPUT" &&
    !["checkbox", "radio", "button"].includes((target as HTMLInputElement).type)
  );
}

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
  const latest = useRef({ confirming, onSelectAll, onClear, onDelete });
  useEffect(() => {
    latest.current = { confirming, onSelectAll, onClear, onDelete };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const cur = latest.current;
      const key = e.key.toLowerCase();
      if (key === "escape") setConfirming(false);
      else if (key === "a") cur.onSelectAll();
      else if (key === "c") cur.onClear();
      else if (key === "d") {
        if (cur.confirming) cur.onDelete();
        else setConfirming(true);
      } else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-5">
      <div
        role="toolbar"
        aria-label="Selection"
        className="bar-in pointer-events-auto flex items-center gap-1.5 rounded-xl border border-border-strong bg-panel-2/95 py-1.5 pr-1.5 pl-3.5 text-[12px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur"
      >
        <span className="mr-2 flex items-center gap-2 text-text tabular-nums">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          {count} selected
        </span>
        <BarButton onClick={onSelectAll} shortcut="A">
          Select all ({selectAllCount})
        </BarButton>
        <BarButton onClick={onClear} shortcut="C">
          Clear
        </BarButton>
        <span aria-hidden className="mx-1 h-4 w-px bg-border-strong" />
        <button
          onClick={() => (confirming ? onDelete() : setConfirming(true))}
          onBlur={() => setConfirming(false)}
          aria-label={
            confirming
              ? `Confirm delete ${label}`
              : `Delete selected (${count})`
          }
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium transition ${
            confirming ? "bg-err text-bg" : "text-err hover:bg-err/10"
          }`}
        >
          {confirming ? `Delete ${label}?` : `Delete selected (${count})`}
          <Kbd strong={confirming}>D</Kbd>
        </button>
      </div>
    </div>
  );
}

function Kbd({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <kbd
      aria-hidden
      className={`rounded border px-1 font-mono text-[10px] leading-4 ${
        strong ? "border-bg/40 text-bg" : "border-border-strong text-subtle"
      }`}
    >
      {children}
    </kbd>
  );
}

function BarButton({
  onClick,
  shortcut,
  children,
}: {
  onClick: () => void;
  shortcut: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted transition hover:bg-panel hover:text-text"
    >
      {children}
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}

function SectionView({
  section,
  open,
  onToggle,
  isSelected,
  onSelect,
  onRemove,
}: {
  section: Section;
  open: boolean;
  onToggle: () => void;
  isSelected: (key: string) => boolean;
  onSelect: (key: string, on: boolean) => void;
  onRemove: (item: Item) => void;
}) {
  const id = `section-${section.key.replace(/[^\w-]/g, "_")}`;
  const picked = section.items.filter((i) => isSelected(i.key)).length;
  return (
    <section
      className={`overflow-clip rounded-xl border bg-panel transition-colors ${
        open
          ? "border-border-strong"
          : "border-border hover:border-border-strong"
      }`}
    >
      <div
        className={`flex items-center ${open ? "sticky top-0 z-10 border-b border-border bg-panel/95 backdrop-blur" : ""}`}
      >
        <button
          id={`${id}-header`}
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          <span
            aria-hidden
            className={`text-[10px] text-subtle transition-transform duration-200 ${open ? "rotate-90 text-accent" : ""}`}
          >
            ▶
          </span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[13px] font-semibold tracking-tight text-text">
              {section.title}
            </span>
            {section.chips && (
              <span className="flex flex-wrap items-center gap-1">
                {section.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded border border-border px-1.5 py-px text-[10.5px] text-muted"
                  >
                    {c}
                  </span>
                ))}
              </span>
            )}
            {section.onDiscard && section.path && (
              <span className="min-w-0 truncate font-mono text-[10.5px] text-subtle">
                {section.path}
              </span>
            )}
          </span>
          {!section.onDiscard && section.path && (
            <span className="hidden font-mono text-[10.5px] text-subtle md:inline">
              {section.path}
            </span>
          )}
          {picked > 0 && (
            <span className="font-mono text-[11px] text-accent tabular-nums">
              {picked}/
            </span>
          )}
          <span className="min-w-7 rounded-md bg-panel-2 px-1.5 py-0.5 text-center font-mono text-[11px] text-muted tabular-nums">
            {section.items.length}
          </span>
        </button>
        {section.onDiscard && (
          <button
            onClick={section.onDiscard}
            aria-label={`Remove ${section.title} from list`}
            title="Remove from list (files are kept)"
            className="mr-2 rounded-md px-2 py-1 text-[11px] text-subtle transition hover:bg-panel-2 hover:text-text"
          >
            ✕
          </button>
        )}
      </div>
      {open && (
        <div id={id} role="region" aria-labelledby={`${id}-header`}>
          {section.note && (
            <p className="flex gap-2 border-b border-border bg-warn/[0.04] px-4 py-2 text-[11px] text-muted">
              <span aria-hidden className="text-warn">
                !
              </span>
              {section.note}
            </p>
          )}
          {section.error && (
            <p
              role="alert"
              className="border-b border-border px-4 py-2 text-[11.5px] text-err"
            >
              {section.error}
            </p>
          )}
          {section.items.length === 0 && !section.error ? (
            <p className="px-4 py-3 text-[11.5px] text-subtle">
              No skills in this folder.
            </p>
          ) : (
            <ul className="py-1">
              {section.items.map((item, i) => (
                <SkillItem
                  key={item.key}
                  index={i}
                  item={item}
                  selected={isSelected(item.key)}
                  onSelect={(on) => onSelect(item.key, on)}
                  onRemove={() => onRemove(item)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function SkillItem({
  index,
  item,
  selected,
  onSelect,
  onRemove,
}: {
  index: number;
  item: Item;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li
      style={{ animationDelay: `${Math.min(index, 20) * 12}ms` }}
      className={`rise group flex items-center gap-3 px-4 py-1.5 transition-colors ${
        selected
          ? "bg-accent-soft/50 shadow-[inset_2px_0_0_var(--color-accent)]"
          : "hover:bg-panel-2"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        aria-label={`Select ${item.name}`}
        className="check"
      />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[12.5px] ${selected ? "text-text" : "text-text/90"}`}
        >
          {item.name}
        </div>
        <div className="truncate font-mono text-[10.5px] text-subtle">
          {item.source ?? "local"}
        </div>
      </div>
      {item.tag && (
        <span
          title={item.group.agents.join(", ")}
          className="shrink-0 rounded border border-border px-1.5 py-px text-[10.5px] text-muted"
        >
          {item.tag}
        </span>
      )}
      <button
        onClick={() => (confirming ? onRemove() : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        aria-label={`${confirming ? "Confirm delete" : "Delete"} ${item.name}`}
        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
          confirming
            ? "bg-err text-bg"
            : "text-muted opacity-0 group-hover:opacity-100 hover:bg-err/10 hover:text-err focus:opacity-100"
        }`}
      >
        {confirming ? "Confirm?" : "Delete"}
      </button>
    </li>
  );
}
