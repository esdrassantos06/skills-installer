import { useCallback, useEffect, useState } from "react";
import type { SkillDetail } from "../../../../main/skillDetail";

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; detail: SkillDetail };

export function useSkillDetail(id: string) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    window.api.skillDetail(id).then(
      ({ detail, error }) => {
        if (cancelled) return;
        setState(
          detail
            ? { status: "ready", detail }
            : { status: "error", error: error ?? "Could not load this skill" },
        );
      },
      (err: Error) => {
        if (!cancelled) setState({ status: "error", error: err.message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
