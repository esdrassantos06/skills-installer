import type { Skill } from "../../../../main/searchReducer";

export function rankFeatured(batches: Skill[][], limit: number): Skill[] {
  const unique = new Map<string, Skill>();
  for (const batch of batches) {
    for (const skill of batch) {
      if (!unique.has(skill.id)) unique.set(skill.id, skill);
    }
  }
  return [...unique.values()]
    .sort((a, b) => b.installs - a.installs)
    .slice(0, limit);
}
