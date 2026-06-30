import type { Skill, SortMode } from "../../../../main/searchReducer";
import { SUGGESTIONS, SORT_OPTIONS } from "./constants";
import { ResultsView } from "./ResultsView";
import { SkeletonList } from "./SkeletonList";

export function HomeView({
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
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Featured";

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
              ? "loading…"
              : `${featured.length} skills across categories`}
          </span>
        </div>
        {featuredLoading ? (
          <SkeletonList />
        ) : featured.length === 0 ? (
          <div className="rounded-lg border border-border bg-panel/60 p-5 text-center text-[12.5px] text-muted">
            <div className="text-text">No featured skills loaded yet</div>
            <div className="mt-1.5 text-[11.5px]">
              The skills.sh API rate-limited this batch. Wait a few seconds and
              try again.
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
          only. No timestamps. The Featured list is the union of the top results
          across a handful of broad categories, deduplicated and sorted by
          install count. Queries require at least 2 characters.
        </p>
      </div>
    </div>
  );
}
