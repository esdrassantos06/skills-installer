import { useSyncExternalStore } from "react";

const PREFIX = "#/skills/";

/** Hash href for a skill detail route, e.g. `#/skills/owner/repo/skill`. */
export function skillHref(id: string): string {
  return PREFIX + id;
}

/** Skill id from a `#/skills/owner/repo/skill` hash, or null for any other route. */
export function parseSkillRoute(hash: string): string | null {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    return decodeURIComponent(hash.slice(PREFIX.length)) || null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** Skill id of the current hash route, or null when no skill page is open. */
export function useSkillRoute(): string | null {
  return parseSkillRoute(useSyncExternalStore(subscribe, () => location.hash));
}

/** Leaves the skill page, returning to wherever it was opened from. */
export function closeSkillRoute() {
  if (history.length > 1) history.back();
  else location.hash = "";
}
