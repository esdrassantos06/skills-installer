export type Tab<T extends string> = { id: T; label: string };

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Views"
      className="titlebar-drag flex items-center gap-1 border-b border-border bg-bg/80 px-3 pt-2 pb-0 pl-24 backdrop-blur"
    >
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          id={tab.id}
          active={active === tab.id}
          label={tab.label}
          onClick={() => onChange(tab.id)}
        />
      ))}
    </nav>
  );
}

function TabButton({
  id,
  active,
  label,
  onClick,
}: {
  id: string;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onClick}
      className={`titlebar-nodrag relative -mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-[12px] transition ${
        active
          ? "border-border bg-panel text-text"
          : "border-transparent text-muted hover:text-text"
      }`}
    >
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute -bottom-px left-0 right-0 h-px bg-panel"
        />
      )}
    </button>
  );
}
