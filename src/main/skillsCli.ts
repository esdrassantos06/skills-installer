import { join } from "node:path";

/**
 * Absolute path to the bundled `skills` CLI entry point.
 *
 * In a packaged build electron-builder unpacks node_modules next to the asar
 * (`asarUnpack`) because Node's ESM loader cannot import from inside an
 * archive; `app.getAppPath()` still points at `app.asar`, so redirect it. In
 * dev the app path is already the project root.
 */
export function resolveSkillsCliPath(appPath: string): string {
  const root = appPath.endsWith("app.asar") ? `${appPath}.unpacked` : appPath;
  return join(root, "node_modules", "skills", "bin", "cli.mjs");
}
