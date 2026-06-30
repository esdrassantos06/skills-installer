import type { SortMode } from "../../../../main/searchReducer";
import { SORT_OPTIONS } from "./constants";

export function SortMenu({
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
              ? "bg-accent-soft text-accent"
              : "text-muted hover:text-text"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
