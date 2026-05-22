#!/usr/bin/env node
/**
 * Ensure that node_modules/electron/dist contains a usable Electron binary
 * after `npm install`.
 *
 * Background: the `electron` package downloads its ~140MB platform binary via
 * its own postinstall (`node install.js`), which uses `extract-zip@2.0.1` (last
 * release 2020). On Node 24+ that extractor silently aborts after the first zip
 * entry on Windows, leaving only `dxil.dll` in `dist/` and no `electron.exe`.
 * The downloaded zip itself is fine — only the JS extractor is broken.
 *
 * This script runs after `npm install` and:
 *   1. Re-runs the upstream install.js (no-op if already extracted correctly).
 *   2. Detects the partial-extraction state.
 *   3. Falls back to a native extractor (PowerShell Expand-Archive on Windows,
 *      `unzip` elsewhere) on the cached zip that @electron/get already
 *      downloaded.
 *   4. Writes `path.txt` so electron-vite's `getElectronPath()` can find the
 *      binary.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[ensure-electron-binary]";
const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const electronDir = join(rootDir, "node_modules", "electron");

if (!existsSync(join(electronDir, "install.js"))) {
  process.exit(0);
}

const distDir = join(electronDir, "dist");
const pathTxt = join(electronDir, "path.txt");
const version = JSON.parse(
  readFileSync(join(electronDir, "package.json"), "utf8"),
).version;

const platform = process.env.npm_config_platform || process.platform;
const arch = process.env.npm_config_arch || process.arch;

const platformBinaryRoot = {
  win32: "electron.exe",
  linux: "electron",
  darwin: "Electron.app",
}[platform];
const platformBinaryPath = {
  win32: "electron.exe",
  linux: "electron",
  darwin: "Electron.app/Contents/MacOS/Electron",
}[platform];

if (!platformBinaryRoot) {
  console.warn(`${TAG} unsupported platform: ${platform}`);
  process.exit(0);
}

const isInstalled = () => existsSync(join(distDir, platformBinaryRoot));

try {
  execFileSync(process.execPath, [join(electronDir, "install.js")], {
    stdio: "inherit",
  });
} catch (err) {
  console.warn(`${TAG} upstream install.js exited with error: ${err.message}`);
}

if (isInstalled()) {
  if (!existsSync(pathTxt)) writeFileSync(pathTxt, platformBinaryPath);
  process.exit(0);
}

console.warn(
  `${TAG} electron binary missing after install.js; falling back to native unzip`,
);

const cacheRoots = [];
if (process.env.electron_config_cache)
  cacheRoots.push(process.env.electron_config_cache);
if (platform === "win32") {
  const local =
    process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  cacheRoots.push(join(local, "electron", "Cache"));
} else if (platform === "darwin") {
  cacheRoots.push(join(homedir(), "Library", "Caches", "electron"));
} else {
  const xdg = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
  cacheRoots.push(join(xdg, "electron"));
}

const zipName = `electron-v${version}-${platform}-${arch}.zip`;
let zipPath = null;
for (const root of cacheRoots) {
  if (!existsSync(root)) continue;
  for (const entry of readdirSync(root)) {
    const candidate = join(root, entry, zipName);
    if (existsSync(candidate)) {
      zipPath = candidate;
      break;
    }
  }
  if (zipPath) break;
}

if (!zipPath) {
  console.error(
    `${TAG} could not locate cached ${zipName}. Try re-running npm install with a working network connection.`,
  );
  process.exit(1);
}

console.warn(`${TAG} extracting ${zipPath} -> ${distDir}`);
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

if (platform === "win32") {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Expand-Archive -LiteralPath ${quotePs(zipPath)} -DestinationPath ${quotePs(distDir)} -Force`,
    ],
    { stdio: "inherit" },
  );
} else {
  execFileSync("unzip", ["-q", "-o", zipPath, "-d", distDir], {
    stdio: "inherit",
  });
}

const distTypeDef = join(distDir, "electron.d.ts");
const targetTypeDef = join(electronDir, "electron.d.ts");
if (existsSync(distTypeDef)) {
  renameSync(distTypeDef, targetTypeDef);
}

writeFileSync(pathTxt, platformBinaryPath);

if (!isInstalled()) {
  console.error(
    `${TAG} extraction finished but ${platformBinaryRoot} still not in dist/`,
  );
  process.exit(1);
}

console.warn(`${TAG} electron binary recovered successfully`);

function quotePs(s) {
  return `'${s.replace(/'/g, "''")}'`;
}
