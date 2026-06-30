import { useEffect, useReducer, useRef } from "react";
import { reducer, initialState } from "../../../../main/searchReducer";

export function useSkillSearch() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = state.query.trim();
    if (q.length < 2) return;
    debounceRef.current = window.setTimeout(async () => {
      dispatch({ type: "searchStarted" });
      const r = await window.api.searchSkills(q);
      if (r.error) dispatch({ type: "searchFailed", error: r.error });
      else dispatch({ type: "searchSucceeded", skills: r.skills });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [state.query]);

  return { state, dispatch };
}
