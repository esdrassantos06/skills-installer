import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { FORCE_KEY } from "../../lib/storageKeys";
import { parseSkillLines } from "../../lib/lines";
import { summarizeRuns } from "./runsReducer";
import { useInstallRuns } from "./useInstallRuns";
import { useAutoFollow } from "./useAutoFollow";
import { InstallerTitlebar } from "./InstallerTitlebar";
import { CommandsPanel } from "./CommandsPanel";
import { ExecutionPanel } from "./ExecutionPanel";

export function Installer({
  agents,
  rememberAgents,
  onChangeAgents,
  input,
  setInput,
}: {
  agents: string[];
  rememberAgents: boolean;
  onChangeAgents: () => void;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
}) {
  const [force, setForce] = useState(
    () => localStorage.getItem(FORCE_KEY) === "1",
  );
  const { runs, running, summary, start, toggle } = useInstallRuns();
  const autoFollow = useAutoFollow(runs);
  const rootRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<() => void>(() => {});

  useEffect(() => {
    localStorage.setItem(FORCE_KEY, force ? "1" : "0");
  }, [force]);

  const parsedLines = useMemo(() => parseSkillLines(input), [input]);
  const counts = useMemo(() => summarizeRuns(runs), [runs]);

  const run = useCallback(() => {
    if (!parsedLines.length || running) return;
    autoFollow.follow();
    start(input.split("\n"), { agents, global: true, force });
  }, [parsedLines.length, running, autoFollow, start, input, agents, force]);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    function isVisible() {
      return rootRef.current?.offsetParent !== null;
    }
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!isVisible()) return;
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (
          tag === "INPUT" &&
          (target as HTMLInputElement).type !== "checkbox"
        ) {
          return;
        }
        e.preventDefault();
        runRef.current();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={rootRef} className="bg-canvas flex h-full flex-col">
      <InstallerTitlebar
        running={running}
        parsedCount={parsedLines.length}
        summary={summary}
        progress={counts.progress}
        agents={agents}
        rememberAgents={rememberAgents}
        onChangeAgents={onChangeAgents}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(420px,1fr)_minmax(420px,1.2fr)] gap-3 px-3 pb-3">
        <CommandsPanel
          input={input}
          setInput={setInput}
          running={running}
          parsedCount={parsedLines.length}
          force={force}
          setForce={setForce}
          onRun={run}
        />
        <ExecutionPanel
          runs={runs}
          running={running}
          summary={summary}
          counts={counts}
          onToggle={toggle}
          containerRef={autoFollow.containerRef}
          following={autoFollow.following}
          activeIndex={autoFollow.activeIndex}
          onScroll={autoFollow.onScroll}
          onFollow={autoFollow.follow}
        />
      </main>
    </div>
  );
}
