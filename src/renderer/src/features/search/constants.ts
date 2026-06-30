import type { SortMode } from "../../../../main/searchReducer";

export const SUGGESTIONS = [
  "react",
  "nextjs",
  "typescript",
  "design",
  "testing",
  "security",
  "docs",
];

export const FEATURED_SEED_QUERIES = [
  "react",
  "design",
  "testing",
  "security",
  "docs",
  "typescript",
  "nextjs",
  "best-practices",
];

export const FEATURED_LIMIT = 40;

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "installs-desc", label: "Featured" },
  { value: "installs-asc", label: "Fewest installs" },
  { value: "name-asc", label: "A-Z" },
  { value: "name-desc", label: "Z-A" },
];
