export function SkeletonList() {
  return (
    <ul className="space-y-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border bg-panel-2/30 px-3 py-3"
        >
          <div className="h-3 w-1/3 animate-pulse rounded bg-border" />
          <div className="ml-auto h-3 w-12 animate-pulse rounded bg-border" />
        </li>
      ))}
    </ul>
  );
}
