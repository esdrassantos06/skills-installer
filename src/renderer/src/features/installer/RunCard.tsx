import { StatusIcon } from "./StatusIcon";
import type { Run } from "./runsReducer";

export function RunCard({ run, onToggle }: { run: Run; onToggle: () => void }) {
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

  const label = run.source || run.cmd;
  const hasLog = run.log.length > 0;

  return (
    <li
      data-run-index={run.index}
      className={`overflow-hidden rounded-lg border ${borderColor} bg-panel-2/40 transition`}
    >
      <button
        onClick={onToggle}
        aria-expanded={run.expanded}
        aria-label={`${label}, ${run.status}`}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-panel-2"
      >
        <StatusIcon status={run.status} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[12.5px] text-text">
            {label}
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
        <span aria-hidden className="text-subtle text-[11px]">
          {run.expanded ? "−" : "+"}
        </span>
      </button>
      {run.expanded && hasLog && (
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
