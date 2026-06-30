export function EmptyResults({ query }: { query: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-subtle">
      <div>
        <div className="text-[13px] text-muted">No results</div>
        <div className="mt-1 text-[11.5px]">
          for <code className="text-text">{query}</code>
        </div>
      </div>
    </div>
  );
}

export function ErrorView({ error }: { error: string }) {
  return (
    <div
      role="alert"
      className="mx-auto mt-12 max-w-md rounded-lg border border-err/40 bg-err/5 p-4 text-[12.5px] text-err"
    >
      <div className="mb-1 text-[10.5px] uppercase tracking-wider">error</div>
      {error}
    </div>
  );
}
