import { vi } from "vitest";
import type { Api } from "../../../preload";

type Listener = (event: unknown) => void;

export type MockApi = {
  api: Api;
  emit: (channel: string, event: unknown) => void;
  listenerCount: (channel: string) => number;
};

export function createMockApi(): MockApi {
  const listeners = new Map<string, Set<Listener>>();

  function subscribe(channel: string) {
    return (cb: Listener) => {
      const set = listeners.get(channel) ?? new Set<Listener>();
      set.add(cb);
      listeners.set(channel, set);
      return () => set.delete(cb);
    };
  }

  const api = {
    installAll: vi.fn().mockResolvedValue({ ok: 0, fail: 0, skipped: 0 }),
    searchSkills: vi
      .fn()
      .mockResolvedValue({ skills: [], error: null, cached: false }),
    clearSearchCache: vi.fn().mockResolvedValue({ ok: true }),
    onPlan: subscribe("plan"),
    onStart: subscribe("start"),
    onLog: subscribe("log"),
    onDone: subscribe("done"),
    onHeartbeat: subscribe("heartbeat"),
    onFinished: subscribe("finished"),
  } as unknown as Api;

  return {
    api,
    emit(channel, event) {
      listeners.get(channel)?.forEach((cb) => cb(event));
    },
    listenerCount(channel) {
      return listeners.get(channel)?.size ?? 0;
    },
  };
}

export function installMockApi(): MockApi {
  const mock = createMockApi();
  (window as unknown as { api: Api }).api = mock.api;
  return mock;
}
