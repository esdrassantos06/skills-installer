import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activeRunIndex, type Run } from "./runsReducer";

const FOLLOW_TOP_GAP = 12;

export function useAutoFollow(runs: Run[]) {
  const [following, setFollowing] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const selfScroll = useRef(false);

  const activeIndex = useMemo(() => activeRunIndex(runs), [runs]);

  const activeElement = useCallback((): HTMLElement | null => {
    const container = containerRef.current;
    if (!container || activeIndex < 0) return null;
    return container.querySelector<HTMLElement>(
      `[data-run-index="${activeIndex}"]`,
    );
  }, [activeIndex]);

  useEffect(() => {
    if (!following) return;
    const container = containerRef.current;
    const el = activeElement();
    if (!container || !el) return;
    const top = Math.max(0, el.offsetTop - FOLLOW_TOP_GAP);
    if (container.scrollTop === top) return;
    selfScroll.current = true;
    container.scrollTop = top;
  }, [runs, following, activeElement]);

  const onScroll = useCallback(() => {
    if (selfScroll.current) {
      selfScroll.current = false;
      return;
    }
    const container = containerRef.current;
    const el = activeElement();
    if (!container || !el) return;
    const top = el.offsetTop - container.scrollTop;
    const visible =
      top + el.offsetHeight > 24 && top < container.clientHeight - 24;
    setFollowing(visible);
  }, [activeElement]);

  const follow = useCallback(() => setFollowing(true), []);

  return { containerRef, following, activeIndex, onScroll, follow };
}
