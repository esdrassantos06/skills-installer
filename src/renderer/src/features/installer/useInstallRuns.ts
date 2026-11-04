import { useCallback, useEffect, useReducer, useState } from "react";
import type {
  DoneEvent,
  FinishedEvent,
  InstallOptions,
  LogEvent,
  PlanEvent,
  StartEvent,
} from "../../../../preload";
import { runsReducer } from "./runsReducer";

export function useInstallRuns() {
  const [runs, dispatch] = useReducer(runsReducer, []);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<FinishedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offs = [
      window.api.onPlan((e: PlanEvent) =>
        dispatch({ type: "plan", commands: e.commands }),
      ),
      window.api.onStart((e: StartEvent) =>
        dispatch({ type: "start", index: e.index, cmd: e.cmd }),
      ),
      window.api.onLog((e: LogEvent) =>
        dispatch({
          type: "log",
          index: e.index,
          stream: e.stream,
          text: e.text,
        }),
      ),
      window.api.onDone((e: DoneEvent) =>
        dispatch({
          type: "done",
          index: e.index,
          code: e.code,
          alreadyInstalled: e.alreadyInstalled,
        }),
      ),
      window.api.onFinished((e: FinishedEvent) => {
        setSummary(e);
        setRunning(false);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const start = useCallback(async (lines: string[], opts: InstallOptions) => {
    setRunning(true);
    setSummary(null);
    setError(null);
    dispatch({ type: "reset" });
    try {
      await window.api.installAll(lines, opts);
    } catch (err) {
      setError(
        (err as Error).message.replace(
          /^Error invoking remote method '[^']+': (Error: )?/,
          "",
        ),
      );
      setRunning(false);
    }
  }, []);

  const toggle = useCallback(
    (index: number) => dispatch({ type: "toggle", index }),
    [],
  );

  return { runs, running, summary, error, start, toggle };
}
