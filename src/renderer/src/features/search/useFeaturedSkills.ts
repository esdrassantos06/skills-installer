import { useCallback, useEffect, useState } from "react";
import type { Skill } from "../../../../main/searchReducer";
import { rankFeatured } from "./featured";

export function useFeaturedSkills(seedQueries: string[], limit: number) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      seedQueries.map((q) =>
        window.api.searchSkills(q).then(
          (r) => (r.error ? [] : r.skills),
          () => [] as Skill[],
        ),
      ),
    ).then((batches) => {
      if (cancelled) return;
      setSkills(rankFeatured(batches, limit));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [seedQueries, limit, attempt]);

  const retry = useCallback(() => {
    setSkills([]);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { skills, loading, retry };
}
