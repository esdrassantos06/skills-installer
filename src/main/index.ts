import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  session,
  shell,
} from "electron";
import { spawn } from "node:child_process";
import { mkdtemp, open, readFile, rm } from "node:fs/promises";
import { availableParallelism, homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { parseLine, detectAlreadyInstalled } from "./parser";
import { searchSkills, SkillsApiError, type Skill } from "./skillsApi";
import { getSkillDetail, type SkillDetail } from "./skillDetail";
import { Cache } from "./cache";
import { cleanCliOutput } from "./cleanCliOutput";
import { resolveSkillsCliPath } from "./skillsCli";
import {
  defaultDeps,
  getInstalledSkillNames,
  shouldSkip,
} from "./installedSkills";
import { resolveProjectDir } from "./projectDir";
import { removeUnlinkedSharedCopy } from "./sharedCopy";
import { resolveConcurrency } from "./concurrency";
import { createLogBuffer } from "./logBuffer";
import { contentSecurityPolicy } from "./csp";
import {
  parseInstalledList,
  isSharedIds,
  planRemovals,
  removeArgs,
  stillInstalled,
  type InstalledSkill,
  type Removal,
} from "./installedList";

export type InstallOptions = {
  agents: string[];
  global: boolean;
  force: boolean;
  cwd: string | null;
};

const HEARTBEAT_MS = 15_000;
const LOG_FLUSH_MS = 50;

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MAX = 100;
const searchCache = new Cache<Skill[]>({
  ttlMs: SEARCH_CACHE_TTL_MS,
  maxEntries: SEARCH_CACHE_MAX,
});

const DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;
const DETAIL_CACHE_MAX = 50;
const detailCache = new Cache<SkillDetail>({
  ttlMs: DETAIL_CACHE_TTL_MS,
  maxEntries: DETAIL_CACHE_MAX,
});

function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 760,
    minHeight: 480,
    backgroundColor: "#0a0b0e",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
  }

  const csp = contentSecurityPolicy(!!process.env["ELECTRON_RENDERER_URL"]);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

  ipcMain.handle(
    "install-all",
    async (evt, lines: string[], opts: InstallOptions) => {
      const send = (channel: string, payload: unknown) => {
        if (!evt.sender.isDestroyed()) evt.sender.send(channel, payload);
      };

      const skillsCli = resolveSkillsCliPath(app.getAppPath());
      const cwd = await resolveProjectDir(opts.cwd);
      const parseOpts = { ...opts, global: cwd === null };

      const parsed = lines
        .map((raw) => parseLine(raw, parseOpts))
        .filter(
          (p): p is NonNullable<ReturnType<typeof parseLine>> => p !== null,
        );

      send("install:plan", {
        total: parsed.length,
        commands: parsed.map((p) => ({ display: p.display, source: p.source })),
      });

      const candidateNames = parsed.flatMap((p) => p.skillNames);
      const installedSet = await getInstalledSkillNames(
        candidateNames,
        cwd ? { ...defaultDeps, homedir: () => cwd } : defaultDeps,
      );

      let ok = 0;
      let fail = 0;
      let skipped = 0;
      let nextIdx = 0;

      const worker = async () => {
        while (true) {
          const i = nextIdx++;
          if (i >= parsed.length) return;
          const p = parsed[i];
          send("install:start", { index: i, cmd: p.display });

          if (shouldSkip(p.skillNames, installedSet, opts.force)) {
            send("install:log", {
              index: i,
              stream: "out",
              text: `Already installed (${p.skillNames.join(", ")}). Skipping. Toggle "force reinstall" to override.\n`,
            });
            send("install:done", { index: i, code: 0, alreadyInstalled: true });
            skipped++;
            continue;
          }

          const result = await runSingle({
            index: i,
            cliPath: skillsCli,
            cwd,
            args: p.args,
            send,
          });

          send("install:done", {
            index: i,
            code: result.code,
            alreadyInstalled: result.alreadyInstalled,
          });

          if (result.alreadyInstalled) skipped++;
          else if (result.code === 0) ok++;
          else fail++;
        }
      };

      const workerCount = resolveConcurrency(parsed.length, {
        env: process.env.SKILLS_INSTALL_CONCURRENCY,
        cpuCount: availableParallelism(),
      });
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      send("install:finished", { ok, fail, skipped });
      return { ok, fail, skipped };
    },
  );

  ipcMain.handle(
    "search-skills",
    async (
      _evt,
      query: string,
    ): Promise<{ skills: Skill[]; error: string | null; cached: boolean }> => {
      const cached = searchCache.get(query);
      if (cached) {
        return { skills: cached, error: null, cached: true };
      }
      try {
        const r = await searchSkills(query);
        searchCache.set(query, r.skills);
        return { skills: r.skills, error: null, cached: false };
      } catch (err) {
        const message =
          err instanceof SkillsApiError
            ? err.message
            : `Unknown error: ${(err as Error).message}`;
        return { skills: [], error: message, cached: false };
      }
    },
  );

  ipcMain.handle(
    "skill-detail",
    async (
      _evt,
      id: string,
    ): Promise<{ detail: SkillDetail | null; error: string | null }> => {
      const cached = detailCache.get(id);
      if (cached) return { detail: cached, error: null };
      try {
        const detail = await getSkillDetail(id);
        detailCache.set(id, detail);
        return { detail, error: null };
      } catch (err) {
        const message =
          err instanceof SkillsApiError
            ? err.message
            : `Unknown error: ${(err as Error).message}`;
        return { detail: null, error: message };
      }
    },
  );

  ipcMain.handle(
    "installed-list",
    async (
      _evt,
      dir: string | null,
    ): Promise<{ skills: InstalledSkill[]; error: string | null }> => {
      try {
        return {
          skills: await listInstalled(await resolveProjectDir(dir)),
          error: null,
        };
      } catch (err) {
        return { skills: [], error: (err as Error).message };
      }
    },
  );

  let removeQueue: Promise<unknown> = Promise.resolve();
  ipcMain.handle(
    "skills-remove",
    (_evt, removals: Removal[], dir: string | null) => {
      const run = removeQueue.then(() => removeSkills(removals, dir));
      removeQueue = run;
      return run;
    },
  );

  ipcMain.handle("choose-folder", async (evt): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    const options = {
      properties: ["openDirectory", "createDirectory"] as (
        "openDirectory" | "createDirectory"
      )[],
    };
    const r = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    return r.canceled ? null : (r.filePaths[0] ?? null);
  });

  ipcMain.handle("search-cache-clear", () => {
    searchCache.clear();
    detailCache.clear();
    return { ok: true };
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

type RunResult = { code: number; alreadyInstalled: boolean };

function runSingle(p: {
  index: number;
  cliPath: string;
  cwd: string | null;
  args: string[];
  send: (channel: string, payload: unknown) => void;
}): Promise<RunResult> {
  return new Promise((resolve) => {
    let alreadyInstalled = false;
    let lastOutputAt = Date.now();
    let settled = false;

    const outBuf = createLogBuffer(
      (text) => p.send("install:log", { index: p.index, stream: "out", text }),
      LOG_FLUSH_MS,
    );
    const errBuf = createLogBuffer(
      (text) => p.send("install:log", { index: p.index, stream: "err", text }),
      LOG_FLUSH_MS,
    );
    const stopBuffers = () => {
      outBuf.stop();
      errBuf.stop();
    };

    // Run the bundled skills CLI on Electron's own Node (ELECTRON_RUN_AS_NODE),
    // so no system Node/npm is required and no shell is involved.
    const child = spawn(process.execPath, [p.cliPath, ...p.args], {
      cwd: p.cwd ?? undefined,
      env: cliEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    const heartbeat = setInterval(() => {
      const idle = Date.now() - lastOutputAt;
      p.send("install:heartbeat", {
        index: p.index,
        idleMs: idle,
      });
      if (idle > 90_000) {
        errBuf.push(
          `\n[timeout] no output for ${Math.round(idle / 1000)}s. Killing process.\n`,
        );
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 2000);
      }
    }, HEARTBEAT_MS);

    const onData = (text: string, stream: "out" | "err") => {
      lastOutputAt = Date.now();
      const cleaned = cleanCliOutput(text);
      if (!cleaned) return;
      if (detectAlreadyInstalled(cleaned)) alreadyInstalled = true;
      (stream === "out" ? outBuf : errBuf).push(cleaned);
    };

    child.stdout.on("data", (d) => onData(d.toString(), "out"));
    child.stderr.on("data", (d) => onData(d.toString(), "err"));

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearInterval(heartbeat);
      stopBuffers();
      resolve({ code: code ?? -1, alreadyInstalled });
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearInterval(heartbeat);
      errBuf.push(String(err));
      stopBuffers();
      resolve({ code: -1, alreadyInstalled });
    });
  });
}

function cliEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    CI: "1",
    FORCE_COLOR: "0",
    NO_COLOR: "1",
  };
}

/**
 * Runs the bundled skills CLI to completion. Stdout goes to a temp file
 * because the CLI exits before a piped stdout drains, cutting output at 64 KB.
 */
async function runCli(
  args: string[],
  cwd: string = homedir(),
): Promise<{ code: number; stdout: string; stderr: string }> {
  const dir = await mkdtemp(join(tmpdir(), "skills-cli-"));
  const outPath = join(dir, "stdout");
  const out = await open(outPath, "w");
  try {
    const { code, stderr } = await new Promise<{
      code: number;
      stderr: string;
    }>((resolve) => {
      const child = spawn(
        process.execPath,
        [resolveSkillsCliPath(app.getAppPath()), ...args],
        { cwd, env: cliEnv(), stdio: ["ignore", out.fd, "pipe"] },
      );
      let stderr = "";
      child.stderr?.on("data", (d) => (stderr += d.toString()));
      child.on("close", (c) => resolve({ code: c ?? -1, stderr }));
      child.on("error", (err) => resolve({ code: -1, stderr: String(err) }));
    });
    return { code, stderr, stdout: await readFile(outPath, "utf8") };
  } finally {
    await out.close();
    await rm(dir, { recursive: true, force: true });
  }
}

function cliError(r: { code: number; stderr: string }, cmd: string): string {
  return (
    cleanCliOutput(r.stderr).trim() ||
    `skills ${cmd} exited with code ${r.code}`
  );
}

/** Lists global skills, or the project's when `cwd` is a folder. */
async function listInstalled(cwd: string | null): Promise<InstalledSkill[]> {
  const r = cwd
    ? await runCli(["list", "--json"], cwd)
    : await runCli(["list", "-g", "--json"]);
  if (r.code !== 0) throw new Error(cliError(r, "list"));
  return parseInstalledList(r.stdout);
}

async function removeSkills(
  removals: Removal[],
  dir: string | null,
): Promise<{ skills: InstalledSkill[] | null; error: string | null }> {
  let cwd: string | null;
  try {
    cwd = await resolveProjectDir(dir);
  } catch (err) {
    return { skills: null, error: (err as Error).message };
  }
  const errors: string[] = [];
  try {
    for (const plan of planRemovals(removals)) {
      const args = removeArgs(plan.names, plan.agentIds, cwd === null);
      const r = cwd ? await runCli(args, cwd) : await runCli(args);
      if (r.code !== 0) errors.push(cliError(r, "remove"));
    }
  } catch (err) {
    errors.push((err as Error).message);
  }
  try {
    let skills = await listInstalled(cwd);
    const base = cwd ?? homedir();
    const linked: string[] = [];
    let cleaned = false;
    for (const r of stillInstalled(skills, removals)) {
      if (!isSharedIds(r.agentIds)) continue;
      const result = await removeUnlinkedSharedCopy(base, r.name);
      if (result.status === "removed") cleaned = true;
      if (result.status === "linked") {
        const from = result.links.map((l) => l.replace(homedir(), "~"));
        linked.push(`${r.name} (linked from ${from.join(", ")})`);
      }
    }
    if (cleaned) skills = await listInstalled(cwd);

    const left = [
      ...new Set(stillInstalled(skills, removals).map((r) => r.name)),
    ];
    if (linked.length > 0) {
      errors.push(
        `Kept in the shared folder because another agent links to it: ${linked.join("; ")}. Delete it there first.`,
      );
    } else if (left.length > 0) {
      errors.push(`Still installed: ${left.join(", ")}.`);
    }
    return { skills, error: errors.join("\n") || null };
  } catch (err) {
    return {
      skills: null,
      error: [...errors, (err as Error).message].join("\n"),
    };
  }
}
