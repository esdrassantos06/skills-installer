import type { SortMode } from "../../../../main/searchReducer";
import { useRef } from "react";
import { SortMenu } from "./SortMenu";
import {
  focusShortcutLabel,
  useFocusShortcut,
} from "../../lib/useFocusShortcut";

export function SearchBar({
  query,
  onQueryChange,
  loading,
  sort,
  onSortChange,
  onClear,
  clearDisabled,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  loading: boolean;
  sort: SortMode;
  onSortChange: (s: SortMode) => void;
  onClear: () => void;
  clearDisabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusShortcut(inputRef);
  return (
    <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search skills on skills.sh (min 2 characters)"
          className="w-full rounded-md border border-border bg-panel px-3 py-2 pr-14 pl-9 text-[13px] outline-none placeholder:text-subtle focus:border-accent"
          aria-label="Search query"
        />
        <span
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
        >
          ⌕
        </span>
        {loading ? (
          <span
            aria-label="Loading"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-accent"
          >
            ●
          </span>
        ) : (
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-subtle"
          >
            {focusShortcutLabel}
          </kbd>
        )}
      </div>
      <SortMenu value={sort} onChange={onSortChange} />
      <button
        onClick={onClear}
        disabled={clearDisabled}
        className="rounded-md border border-border bg-panel px-2.5 py-2 text-[12px] text-muted transition hover:border-err hover:text-err disabled:opacity-40"
      >
        Clear
      </button>
    </header>
  );
}
