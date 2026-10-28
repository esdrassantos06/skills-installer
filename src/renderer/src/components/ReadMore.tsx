import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Clips its content with `collapsedClassName` and offers a toggle, shown only
 * when the clipped content actually overflows.
 */
export function ReadMore({
  children,
  collapsedClassName,
  className = "",
  moreLabel = "Read more",
  lessLabel = "Show less",
}: {
  children: ReactNode;
  collapsedClassName: string;
  className?: string;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, []);

  return (
    <div>
      <div
        ref={ref}
        className={`${className} ${open ? "" : collapsedClassName}`}
      >
        {children}
      </div>
      {(overflows || open) && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="mt-1.5 rounded text-[11.5px] text-accent underline-offset-4 transition hover:underline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {open ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
