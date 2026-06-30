export function parseSkillLines(input: string): string[] {
  return input
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export function appendUniqueLines(current: string, lines: string[]): string {
  const existing = new Set(
    current
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
  const fresh = lines.filter((l) => !existing.has(l));
  if (!fresh.length) return current;
  const trimmed = current.trimEnd();
  return (trimmed ? trimmed + "\n" : "") + fresh.join("\n") + "\n";
}
