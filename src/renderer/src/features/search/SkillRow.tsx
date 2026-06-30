import type { Skill } from "../../../../main/searchReducer";
import { formatInstalls } from "../../lib/format";

export function SkillRow({
  skill,
  onAdd,
}: {
  skill: Skill;
  onAdd: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 rounded-lg border border-border bg-panel-2/30 px-3 py-2.5 transition hover:border-border-strong">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13px] font-medium text-text">
            {skill.name}
          </span>
          <span className="shrink-0 text-[11px] text-subtle">
            {formatInstalls(skill.installs)} installs
          </span>
        </div>
        <div className="truncate font-mono text-[11px] text-muted">
          {skill.source}
        </div>
      </div>
      <button
        onClick={onAdd}
        className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-[11.5px] font-medium text-muted opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:border-accent hover:text-accent"
        aria-label={`Add ${skill.name} to installer`}
      >
        + add
      </button>
    </li>
  );
}
