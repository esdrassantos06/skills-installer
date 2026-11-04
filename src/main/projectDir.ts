import { stat } from "node:fs/promises";
import { isAbsolute } from "node:path";

/**
 * Validates the project folder sent by the renderer. Returns null when no
 * folder was chosen (global install) and throws when the value is not an
 * existing absolute directory, so a stale folder never falls back to global.
 */
export async function resolveProjectDir(dir: unknown): Promise<string | null> {
  if (dir === null || dir === undefined || dir === "") return null;
  if (typeof dir !== "string" || !isAbsolute(dir)) {
    throw new Error(`Invalid folder: ${String(dir)}`);
  }
  const info = await stat(dir).catch(() => null);
  if (!info?.isDirectory()) throw new Error(`Folder not found: ${dir}`);
  return dir;
}
