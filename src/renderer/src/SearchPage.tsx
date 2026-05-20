import { useEffect, useReducer, useRef, useState } from 'react';
import {
  reducer,
  initialState,
  sortSkills,
  type SortMode,
  type Skill,
} from '../../../src/main/searchReducer';

type Props = {
  onAddToInstaller: (skill: Skill) => void;
};

const SUGGESTIONS = [
  'react',
  'nextjs',
  'typescript',
  'design',
  'testing',
  'security',
  'docs',
];

const FEATURED_SEED_QUERIES = [
  'react',
  'design',
  'testing',
  'security',
  'docs',
  'typescript',
  'nextjs',
  'best-practices',
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'installs-desc', label: 'Featured' },
  { value: 'installs-asc', label: 'Fewest installs' },
  { value: 'name-asc', label: 'A–Z' },
  { value: 'name-desc', label: 'Z–A' },
];

export function SearchPage({ onAddToInstaller }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showHint, setShowHint] = useState(false);
  const [featured, setFeatured] = useState<Skill[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredAttempt, setFeaturedAttempt] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFeaturedLoading(true);
    Promise.all(
      FEATURED_SEED_QUERIES.map((q) =>
        window.api.searchSkills(q).then(
          (r) => (r.error ? [] : r.skills),
          () => [] as Skill[],
        ),
      ),
    ).then((arrays) => {
      if (cancelled) return;
      const dedup = new Map<string, Skill>();
      for (const arr of arrays) {
        for (const s of arr) if (!dedup.has(s.id)) dedup.set(s.id, s);
      }
      setFeatured(
        [...dedup.values()]
          .sort((a, b) => b.installs - a.installs)
          .slice(0, 40),
      );
      setFeaturedLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [featuredAttempt]);

  function retryFeatured() {
    setFeaturedAttempt((n) => n + 1);
  }

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = state.query.trim();
    if (q.length < 2) return;
    debounceRef.current = window.setTimeout(async () => {
      dispatch({ type: 'searchStarted' });
      const r = await window.api.searchSkills(q);
      if (r.error) dispatch({ type: 'searchFailed', error: r.error });
      else dispatch({ type: 'searchSucceeded', skills: r.skills });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [state.query]);

  const isHome = state.query.trim().length < 2 && !state.loading;
  const sortedFeatured = sortSkills(featured, state.sort);

  function addSkill(s: Skill) {
    onAddToInstaller(s);
    setShowHint(true);
    window.setTimeout(() => setShowHint(false), 2000);
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="relative flex-1">
          <input
            value={state.query}
            onChange={(e) =>
              dispatch({ type: 'queryChanged', query: e.target.value })
            }
            placeholder="Search skills on skills.sh (min 2 characters)"
            className="w-full rounded-md border border-border bg-panel px-3 py-2 pl-9 text-[13px] outline-none placeholder:text-subtle focus:border-accent"
            aria-label="Search query"
          />
          <span
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
          >
            ⌕
          </span>
          {state.loading && (
            <span
              aria-label="Loading"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-accent"
            >
              ●
            </span>
          )}
        </div>
        <SortMenu
          value={state.sort}
          onChange={(s) => dispatch({ type: 'sortChanged', sort: s })}
        />
        <button
          onClick={() => dispatch({ type: 'cleared' })}
          disabled={!state.query && state.rawResults.length === 0}
          className="rounded-md border border-border bg-panel px-2.5 py-2 text-[12px] text-muted transition hover:border-err hover:text-err disabled:opacity-40"
        >
          Clear
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        {isHome ? (
          <HomeView
            onPick={(q) => dispatch({ type: 'queryChanged', query: q })}
            featured={sortedFeatured}
            featuredLoading={featuredLoading}
            sort={state.sort}
            onAdd={addSkill}
            onRetry={retryFeatured}
          />
        ) : state.error ? (
          <ErrorView error={state.error} />
        ) : state.results.length === 0 && !state.loading ? (
          <EmptyResults query={state.query} />
        ) : (
          <ResultsView results={state.results} onAdd={addSkill} />
        )}
      </div>

      {showHint && (
        <div
          role="status"
          className="border-t border-accent bg-accent-soft px-4 py-2 text-[12px] text-accent"
        >
          ✓ Added to your list. Switch to the <strong>Installer</strong> tab to install.
        </div>
      )}
    </div>
  );
}

function SortMenu({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (s: SortMode) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-border bg-panel p-0.5"
      role="radiogroup"
      aria-label="Sort order"
    >
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded px-2 py-1 text-[11px] transition ${
            value === opt.value
              ? 'bg-accent-soft text-accent'
              : 'text-muted hover:text-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function HomeView({
  onPick,
  featured,
  featuredLoading,
  sort,
  onAdd,
  onRetry,
}: {
  onPick: (q: string) => void;
  featured: Skill[];
  featuredLoading: boolean;
  sort: SortMode;
  onAdd: (s: Skill) => void;
  onRetry: () => void;
}) {
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Featured';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-4 text-center">
        <h2 className="text-[18px] font-semibold tracking-tight">
          Discover skills
        </h2>
        <p className="mt-1.5 text-[12.5px] text-muted">
          <span className="text-accent">skills.sh</span> indexes agent skills
          from across the ecosystem. Search above or click a category.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-full border border-border bg-panel px-3.5 py-1.5 text-[12px] text-muted transition hover:border-accent hover:bg-accent-soft hover:text-text"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {sortLabel}
          </h3>
          <span className="text-[11px] text-subtle">
            {featuredLoading
              ? 'loading…'
              : `${featured.length} skills across categories`}
          </span>
        </div>
        {featuredLoading ? (
          <SkeletonList />
        ) : featured.length === 0 ? (
          <div className="rounded-lg border border-border bg-panel/60 p-5 text-center text-[12.5px] text-muted">
            <div className="text-text">No featured skills loaded yet</div>
            <div className="mt-1.5 text-[11.5px]">
              The skills.sh API rate-limited this batch. Wait a few seconds
              and try again.
            </div>
            <button
              onClick={onRetry}
              className="mt-3 rounded-md border border-border bg-panel px-3 py-1.5 text-[12px] text-text transition hover:border-accent hover:text-accent"
            >
              Retry
            </button>
          </div>
        ) : (
          <ResultsView results={featured} onAdd={onAdd} />
        )}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-panel/60 p-4 text-[11.5px] text-muted">
        <div className="mb-1.5 text-[10.5px] uppercase tracking-wider text-subtle">
          About this list
        </div>
        <p>
          The public skills.sh API returns id, source, name, and install count
          only. No timestamps. The Featured list is the union of the top
          results across a handful of broad categories, deduplicated and
          sorted by install count. Queries require at least 2 characters.
        </p>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border bg-panel-2/30 px-3 py-3"
        >
          <div className="h-3 w-1/3 animate-pulse rounded bg-border" />
          <div className="ml-auto h-3 w-12 animate-pulse rounded bg-border" />
        </li>
      ))}
    </ul>
  );
}

function ResultsView({
  results,
  onAdd,
}: {
  results: Skill[];
  onAdd: (s: Skill) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {results.map((s) => (
        <SkillRow key={s.id} skill={s} onAdd={() => onAdd(s)} />
      ))}
    </ul>
  );
}

function SkillRow({ skill, onAdd }: { skill: Skill; onAdd: () => void }) {
  return (
    <li className="group flex items-center gap-3 rounded-lg border border-border bg-panel-2/30 px-3 py-2.5 transition hover:border-border-strong">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13px] font-medium text-text">
            {skill.name}
          </span>
          <span className="shrink-0 text-[11px] text-subtle">
            {formatInstalls(skill.installs)} installs
          </span>
        </div>
        <div className="truncate font-mono text-[11px] text-muted">
          {skill.source}
        </div>
      </div>
      <button
        onClick={onAdd}
        className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-[11.5px] font-medium text-muted opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:border-accent hover:text-accent"
        aria-label={`Add ${skill.name} to installer`}
      >
        + add
      </button>
    </li>
  );
}

function EmptyResults({ query }: { query: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-subtle">
      <div>
        <div className="text-[13px] text-muted">No results</div>
        <div className="mt-1 text-[11.5px]">
          for <code className="text-text">{query}</code>
        </div>
      </div>
    </div>
  );
}

function ErrorView({ error }: { error: string }) {
  return (
    <div
      role="alert"
      className="mx-auto mt-12 max-w-md rounded-lg border border-err/40 bg-err/5 p-4 text-[12.5px] text-err"
    >
      <div className="mb-1 text-[10.5px] uppercase tracking-wider">error</div>
      {error}
    </div>
  );
}

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
