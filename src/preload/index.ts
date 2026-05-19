import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type LogEvent = { index: number; stream: 'out' | 'err'; text: string };
export type StartEvent = { index: number; cmd: string };
export type DoneEvent = { index: number; code: number; alreadyInstalled: boolean };
export type HeartbeatEvent = { index: number; idleMs: number };
export type PlanEvent = {
  total: number;
  commands: { display: string; source: string }[];
};
export type FinishedEvent = { ok: number; fail: number; skipped: number };

export type InstallOptions = {
  agents: string[];
  global: boolean;
  force: boolean;
};

export type SearchedSkill = {
  id: string;
  skillId: string;
  name: string;
  source: string;
  installs: number;
};

const api = {
  installAll: (lines: string[], opts: InstallOptions): Promise<FinishedEvent> =>
    ipcRenderer.invoke('install-all', lines, opts),

  searchSkills: (
    query: string,
  ): Promise<{ skills: SearchedSkill[]; error: string | null }> =>
    ipcRenderer.invoke('search-skills', query),

  onPlan: (cb: (e: PlanEvent) => void) => listen('install:plan', cb),
  onStart: (cb: (e: StartEvent) => void) => listen('install:start', cb),
  onLog: (cb: (e: LogEvent) => void) => listen('install:log', cb),
  onDone: (cb: (e: DoneEvent) => void) => listen('install:done', cb),
  onHeartbeat: (cb: (e: HeartbeatEvent) => void) =>
    listen('install:heartbeat', cb),
  onFinished: (cb: (e: FinishedEvent) => void) =>
    listen('install:finished', cb),
};

function listen<T>(channel: string, cb: (e: T) => void) {
  const listener = (_: IpcRendererEvent, data: T) => cb(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.off(channel, listener);
}

contextBridge.exposeInMainWorld('api', api);
export type Api = typeof api;
