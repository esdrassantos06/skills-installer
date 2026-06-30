import { Logo } from "../../Logo";
import type { FinishedEvent } from "../../../../preload";

export function InstallerTitlebar({
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
            <span className="pulse-dot inline-block size-1.5 rounded-full bg-accent" />
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
        <div
          role="progressbar"
          aria-label="Install progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="absolute bottom-0 left-0 h-px w-full bg-border"
        >
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </header>
  );
}
