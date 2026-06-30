import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { Panel } from "../../components/Panel";
import { appendUniqueLines } from "../../lib/lines";
import { PRESETS } from "./presets";

export function CommandsPanel({
  input,
  setInput,
  running,
  parsedCount,
  force,
  setForce,
  onRun,
}: {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  running: boolean;
  parsedCount: number;
  force: boolean;
  setForce: Dispatch<SetStateAction<boolean>>;
  onRun: () => void;
}) {
  function appendPreset(lines: string[]) {
    setInput((cur) => appendUniqueLines(cur, lines));
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  }

  return (
    <Panel
      title="Commands"
      subtitle="paste owner/repo@skill, one per line"
      right={
        <span className="text-subtle">
          {parsedCount} {parsedCount === 1 ? "skill" : "skills"}
        </span>
      }
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        aria-label="Skill commands"
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
            <span aria-hidden className="text-subtle group-hover:text-accent">
              +{" "}
            </span>
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
          onClick={onRun}
          disabled={running || parsedCount === 0}
          className="rounded-md bg-accent px-4 py-1.5 text-[13px] font-semibold text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? (
            <span className="inline-flex items-center gap-2">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-bg" />
              Installing
            </span>
          ) : (
            `Install ${parsedCount || ""}`.trim()
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
  );
}
