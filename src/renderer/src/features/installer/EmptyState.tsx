export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-subtle">
      <div className="text-[13px] text-muted">No runs yet</div>
      <div className="max-w-xs text-[11.5px]">
        Paste commands and press{" "}
        <kbd className="rounded border border-border bg-panel px-1 py-0.5 text-[10px] text-muted">
          ⌘↵
        </kbd>{" "}
        or click <span className="text-accent">Install</span>.
      </div>
    </div>
  );
}
