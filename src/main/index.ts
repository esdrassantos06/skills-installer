import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { parseLine, detectAlreadyInstalled } from './parser';

export type InstallOptions = {
  agents: string[];
  global: boolean;
  force: boolean;
};

const HEARTBEAT_MS = 15_000;

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 760,
    minHeight: 480,
    backgroundColor: '#0a0b0e',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle(
    'install-all',
    async (evt, lines: string[], opts: InstallOptions) => {
      const send = (channel: string, payload: unknown) => {
        if (!evt.sender.isDestroyed()) evt.sender.send(channel, payload);
      };

      const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

      const parsed = lines
        .map((raw) => parseLine(raw, opts))
        .filter((p): p is NonNullable<ReturnType<typeof parseLine>> => p !== null);

      send('install:plan', {
        total: parsed.length,
        commands: parsed.map((p) => ({ display: p.display, source: p.source })),
      });

      let ok = 0;
      let fail = 0;
      let skipped = 0;

      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        send('install:start', { index: i, cmd: p.display });

        const result = await runSingle({
          index: i,
          npx,
          args: p.args,
          send,
        });

        send('install:done', {
          index: i,
          code: result.code,
          alreadyInstalled: result.alreadyInstalled,
        });

        if (result.alreadyInstalled) skipped++;
        else if (result.code === 0) ok++;
        else fail++;
      }
      send('install:finished', { ok, fail, skipped });
      return { ok, fail, skipped };
    },
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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

    const child = spawn(p.npx, p.args, {
      env: { ...process.env, CI: '1', FORCE_COLOR: '0', npm_config_yes: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const heartbeat = setInterval(() => {
      const idle = Date.now() - lastOutputAt;
      p.send('install:heartbeat', {
        index: p.index,
        idleMs: idle,
      });
      if (idle > 90_000) {
        p.send('install:log', {
          index: p.index,
          stream: 'err',
          text: `\n[timeout] no output for ${Math.round(idle / 1000)}s — killing process.\n`,
        });
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 2000);
      }
    }, HEARTBEAT_MS);

    const onData = (text: string, stream: 'out' | 'err') => {
      lastOutputAt = Date.now();
      if (detectAlreadyInstalled(text)) alreadyInstalled = true;
      p.send('install:log', { index: p.index, stream, text });
    };

    child.stdout.on('data', (d) => onData(d.toString(), 'out'));
    child.stderr.on('data', (d) => onData(d.toString(), 'err'));

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearInterval(heartbeat);
      resolve({ code: code ?? -1, alreadyInstalled });
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearInterval(heartbeat);
      p.send('install:log', {
        index: p.index,
        stream: 'err',
        text: String(err),
      });
      resolve({ code: -1, alreadyInstalled });
    });
  });
}
