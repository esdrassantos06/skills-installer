import type { Status } from "./runsReducer";

export function StatusIcon({ status }: { status: Status }) {
  if (status === "running")
    return (
      <span
        aria-hidden
        className="pulse-dot inline-block h-2 w-2 shrink-0 rounded-full bg-accent"
      />
    );
  if (status === "ok")
    return (
      <span aria-hidden className="inline-block shrink-0 text-ok">
        ✓
      </span>
    );
  if (status === "err")
    return (
      <span aria-hidden className="inline-block shrink-0 text-err">
        ✗
      </span>
    );
  if (status === "skipped")
    return (
      <span aria-hidden className="inline-block shrink-0 text-warn">
        ↻
      </span>
    );
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full border border-subtle"
    />
  );
}
