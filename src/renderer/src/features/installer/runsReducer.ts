export type Status = "pending" | "running" | "ok" | "err" | "skipped";

export type LogLine = { stream: "out" | "err"; text: string };

export type Run = {
  index: number;
  cmd: string;
  source: string;
  status: Status;
  exitCode?: number;
  log: LogLine[];
  expanded: boolean;
};

export type RunsAction =
  | { type: "plan"; commands: { display: string; source: string }[] }
  | { type: "start"; index: number; cmd: string }
  | { type: "log"; index: number; stream: "out" | "err"; text: string }
  | { type: "done"; index: number; code: number; alreadyInstalled: boolean }
  | { type: "toggle"; index: number }
  | { type: "reset" };

function statusForDone(code: number, alreadyInstalled: boolean): Status {
  if (alreadyInstalled) return "skipped";
  return code === 0 ? "ok" : "err";
}

export function runsReducer(state: Run[], action: RunsAction): Run[] {
  switch (action.type) {
    case "plan":
      return action.commands.map((c, index) => ({
        index,
        cmd: c.display,
        source: c.source,
        status: "pending",
        log: [],
        expanded: false,
      }));

    case "reset":
      return [];

    case "start":
      return state.map((r) =>
        r.index === action.index
          ? { ...r, cmd: action.cmd, status: "running" }
          : r,
      );

    case "log":
      return state.map((r) =>
        r.index === action.index
          ? {
              ...r,
              log: [...r.log, { stream: action.stream, text: action.text }],
            }
          : r,
      );

    case "done":
      return state.map((r) =>
        r.index === action.index
          ? {
              ...r,
              status: statusForDone(action.code, action.alreadyInstalled),
              exitCode: action.code,
              expanded: action.code !== 0 && !action.alreadyInstalled,
            }
          : r,
      );

    case "toggle":
      return state.map((r) =>
        r.index === action.index ? { ...r, expanded: !r.expanded } : r,
      );

    default:
      return state;
  }
}

export function activeRunIndex(runs: Run[]): number {
  let firstPending = -1;
  for (const r of runs) {
    if (r.status === "running") return r.index;
    if (firstPending === -1 && r.status === "pending") firstPending = r.index;
  }
  return firstPending;
}

export type RunsSummary = {
  ok: number;
  err: number;
  skipped: number;
  done: number;
  total: number;
  progress: number;
};

export function summarizeRuns(runs: Run[]): RunsSummary {
  let ok = 0;
  let err = 0;
  let skipped = 0;
  for (const r of runs) {
    if (r.status === "ok") ok++;
    else if (r.status === "err") err++;
    else if (r.status === "skipped") skipped++;
  }
  const done = ok + err + skipped;
  const total = runs.length;
  return {
    ok,
    err,
    skipped,
    done,
    total,
    progress: total ? (done / total) * 100 : 0,
  };
}
