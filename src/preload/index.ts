import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import type { SkillDetail } from "../main/skillDetail";
import type { InstalledSkill, Removal } from "../main/installedList";

export type LogEvent = { index: number; stream: "out" | "err"; text: string };
export type StartEvent = { index: number; cmd: string };
export type DoneEvent = {
  index: number;
  code: number;
  alreadyInstalled: boolean;
};
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
  cwd: string | null;
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
    ipcRenderer.invoke("install-all", lines, opts),

  searchSkills: (
    query: string,
  ): Promise<{
    skills: SearchedSkill[];
    error: string | null;
    cached: boolean;
  }> => ipcRenderer.invoke("search-skills", query),

  clearSearchCache: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("search-cache-clear"),

  skillDetail: (
    id: string,
  ): Promise<{ detail: SkillDetail | null; error: string | null }> =>
    ipcRenderer.invoke("skill-detail", id),

  listInstalled: (
    dir: string | null = null,
  ): Promise<{
    skills: InstalledSkill[];
    error: string | null;
  }> => ipcRenderer.invoke("installed-list", dir),

  removeSkills: (
    removals: Removal[],
    dir: string | null = null,
  ): Promise<{ skills: InstalledSkill[] | null; error: string | null }> =>
    ipcRenderer.invoke("skills-remove", removals, dir),

  chooseFolder: (): Promise<string | null> =>
    ipcRenderer.invoke("choose-folder"),

  onPlan: (cb: (e: PlanEvent) => void) => listen("install:plan", cb),
  onStart: (cb: (e: StartEvent) => void) => listen("install:start", cb),
  onLog: (cb: (e: LogEvent) => void) => listen("install:log", cb),
  onDone: (cb: (e: DoneEvent) => void) => listen("install:done", cb),
  onHeartbeat: (cb: (e: HeartbeatEvent) => void) =>
    listen("install:heartbeat", cb),
  onFinished: (cb: (e: FinishedEvent) => void) =>
    listen("install:finished", cb),
};

function listen<T>(channel: string, cb: (e: T) => void) {
  const listener = (_: IpcRendererEvent, data: T) => cb(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.off(channel, listener);
}

contextBridge.exposeInMainWorld("api", api);
export type Api = typeof api;
