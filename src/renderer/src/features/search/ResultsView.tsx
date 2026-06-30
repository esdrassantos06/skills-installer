import type { Skill } from "../../../../main/searchReducer";
import { SkillRow } from "./SkillRow";

export function ResultsView({
  results,
  onAdd,
}: {
  results: Skill[];
  onAdd: (s: Skill) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {results.map((s) => (
        <SkillRow key={s.id} skill={s} onAdd={() => onAdd(s)} />
      ))}
    </ul>
  );
}
