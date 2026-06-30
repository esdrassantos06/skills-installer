import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { parseLine, detectAlreadyInstalled } from "./parser";
import { searchSkills, SkillsApiError, type Skill } from "./skillsApi";
import { Cache } from "./cache";
import { cleanCliOutput } from "./cleanCliOutput";
import { getInstalledSkillNames, shouldSkip } from "./installedSkills";
import { resolveConcurrency } from "./concurrency";
import { createLogBuffer } from "./logBuffer";
import { contentSecurityPolicy } from "./csp";

export type InstallOptions = {
  agents: string[];
  global: boolean;
  force: boolean;
};

const HEARTBEAT_MS = 15_000;
const LOG_FLUSH_MS = 50;

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MAX = 100;
const searchCache = new Cache<Skill[]>({
  ttlMs: SEARCH_CACHE_TTL_MS,
  maxEntries: SEARCH_CACHE_MAX,
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

      const npx = process.platform === "win32" ? "npx.cmd" : "npx";

      const parsed = lines
        .map((raw) => parseLine(raw, opts))
        .filter(
          (p): p is NonNullable<ReturnType<typeof parseLine>> => p !== null,
        );

      send("install:plan", {
        total: parsed.length,
        commands: parsed.map((p) => ({ display: p.display, source: p.source })),
      });

      const candidateNames = parsed.flatMap((p) => p.skillNames);
      const installedSet = await getInstalledSkillNames(candidateNames);

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
            npx,
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

  ipcMain.handle("search-cache-clear", () => {
    searchCache.clear();
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
  npx: string;
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

    const child = spawn(p.npx, p.args, {
      env: {
        ...process.env,
        CI: "1",
        FORCE_COLOR: "0",
        NO_COLOR: "1",
        npm_config_yes: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
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
