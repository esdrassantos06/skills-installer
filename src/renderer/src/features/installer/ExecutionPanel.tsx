import type { RefObject } from "react";
import { Panel } from "../../components/Panel";
import { EmptyState } from "./EmptyState";
import { RunCard } from "./RunCard";
import type { Run, RunsSummary } from "./runsReducer";
import type { FinishedEvent } from "../../../../preload";

export function ExecutionPanel({
  runs,
  running,
  summary,
  counts,
  onToggle,
  containerRef,
  following,
  activeIndex,
  onScroll,
  onFollow,
}: {
  runs: Run[];
  running: boolean;
  summary: FinishedEvent | null;
  counts: RunsSummary;
  onToggle: (index: number) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  following: boolean;
  activeIndex: number;
  onScroll: () => void;
  onFollow: () => void;
}) {
  const { ok, err, skipped, done, total, progress } = counts;

  return (
    <Panel
      title="Execution"
      subtitle={
        running
          ? `${done} of ${total}`
          : summary
            ? `${summary.ok} ok${summary.skipped ? ` · ${summary.skipped} already installed` : ""}${summary.fail ? ` · ${summary.fail} failed` : ""}`
            : "waiting"
      }
      right={
        total > 0 ? (
          <div className="flex items-center gap-2 text-[11px]">
            {ok > 0 && <span className="text-ok">{ok} ok</span>}
            {skipped > 0 && <span className="text-warn">{skipped} skip</span>}
            {err > 0 && <span className="text-err">{err} failed</span>}
          </div>
        ) : null
      }
    >
      {total > 0 && (
        <div
          role="progressbar"
          aria-label="Execution progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-0.5 w-full bg-border"
        >
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
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
                  onToggle={() => onToggle(r.index)}
                />
              ))}
            </ul>
          )}
        </div>
        {!following && activeIndex >= 0 && (
          <button
            onClick={onFollow}
            aria-label="Follow the active install"
            className="absolute right-4 bottom-4 flex items-center gap-1.5 rounded-full border border-border bg-panel/95 px-3 py-1.5 text-[11px] text-text shadow-lg backdrop-blur transition hover:border-accent hover:text-accent"
          >
            ◎ follow active
          </button>
        )}
      </div>
    </Panel>
  );
}
