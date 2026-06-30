import { describe, it, expect } from "vitest";
import {
  runsReducer,
  activeRunIndex,
  summarizeRuns,
  MAX_LOG_LINES,
  type Run,
} from "./runsReducer";

const plan = {
  type: "plan" as const,
  commands: [
    { display: "npx skills add a/b@one", source: "a/b@one" },
    { display: "npx skills add c/d@two", source: "c/d@two" },
  ],
};

function planned(): Run[] {
  return runsReducer([], plan);
}

describe("runsReducer", () => {
  it("plan creates one pending run per command, indexed in order", () => {
    const runs = planned();
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({
      index: 0,
      source: "a/b@one",
      status: "pending",
      log: [],
      expanded: false,
    });
    expect(runs[1].index).toBe(1);
  });

  it("reset clears all runs", () => {
    expect(runsReducer(planned(), { type: "reset" })).toEqual([]);
  });

  it("start marks the run running and updates its command", () => {
    const runs = runsReducer(planned(), {
      type: "start",
      index: 1,
      cmd: "real cmd",
    });
    expect(runs[1].status).toBe("running");
    expect(runs[1].cmd).toBe("real cmd");
    expect(runs[0].status).toBe("pending");
  });

  it("log appends to the matching run only", () => {
    let runs = runsReducer(planned(), {
      type: "log",
      index: 0,
      stream: "out",
      text: "hello",
    });
    runs = runsReducer(runs, {
      type: "log",
      index: 0,
      stream: "err",
      text: "oops",
    });
    expect(runs[0].log).toEqual([
      { stream: "out", text: "hello" },
      { stream: "err", text: "oops" },
    ]);
    expect(runs[1].log).toEqual([]);
  });

  it("done with code 0 marks ok and stays collapsed", () => {
    const runs = runsReducer(planned(), {
      type: "done",
      index: 0,
      code: 0,
      alreadyInstalled: false,
    });
    expect(runs[0]).toMatchObject({
      status: "ok",
      exitCode: 0,
      expanded: false,
    });
  });

  it("done with a non-zero code marks err and auto-expands", () => {
    const runs = runsReducer(planned(), {
      type: "done",
      index: 0,
      code: 1,
      alreadyInstalled: false,
    });
    expect(runs[0]).toMatchObject({
      status: "err",
      exitCode: 1,
      expanded: true,
    });
  });

  it("alreadyInstalled marks skipped and stays collapsed even if code is non-zero", () => {
    const runs = runsReducer(planned(), {
      type: "done",
      index: 0,
      code: 1,
      alreadyInstalled: true,
    });
    expect(runs[0]).toMatchObject({ status: "skipped", expanded: false });
  });

  it("caps a run's log at MAX_LOG_LINES, dropping the oldest lines", () => {
    let runs = planned();
    const extra = 5;
    for (let i = 0; i < MAX_LOG_LINES + extra; i++) {
      runs = runsReducer(runs, {
        type: "log",
        index: 0,
        stream: "out",
        text: `L${i}`,
      });
    }
    expect(runs[0].log).toHaveLength(MAX_LOG_LINES);
    expect(runs[0].log[0].text).toBe(`L${extra}`);
    expect(runs[0].log.at(-1)?.text).toBe(`L${MAX_LOG_LINES + extra - 1}`);
  });

  it("toggle flips the expanded flag for one run", () => {
    const runs = runsReducer(planned(), { type: "toggle", index: 0 });
    expect(runs[0].expanded).toBe(true);
    expect(runsReducer(runs, { type: "toggle", index: 0 })[0].expanded).toBe(
      false,
    );
  });
});

describe("activeRunIndex", () => {
  it("returns -1 when there are no runs", () => {
    expect(activeRunIndex([])).toBe(-1);
  });

  it("prefers the running run over pending ones", () => {
    let runs = planned();
    runs = runsReducer(runs, { type: "start", index: 1, cmd: "x" });
    expect(activeRunIndex(runs)).toBe(1);
  });

  it("falls back to the first pending run when none are running", () => {
    expect(activeRunIndex(planned())).toBe(0);
  });

  it("returns -1 once every run has finished", () => {
    let runs = planned();
    runs = runsReducer(runs, {
      type: "done",
      index: 0,
      code: 0,
      alreadyInstalled: false,
    });
    runs = runsReducer(runs, {
      type: "done",
      index: 1,
      code: 0,
      alreadyInstalled: false,
    });
    expect(activeRunIndex(runs)).toBe(-1);
  });
});

describe("summarizeRuns", () => {
  it("counts each status and computes progress", () => {
    let runs = planned();
    runs = runsReducer(runs, {
      type: "done",
      index: 0,
      code: 0,
      alreadyInstalled: false,
    });
    const summary = summarizeRuns(runs);
    expect(summary).toEqual({
      ok: 1,
      err: 0,
      skipped: 0,
      done: 1,
      total: 2,
      progress: 50,
    });
  });

  it("reports zero progress with no runs (no division by zero)", () => {
    expect(summarizeRuns([])).toEqual({
      ok: 0,
      err: 0,
      skipped: 0,
      done: 0,
      total: 0,
      progress: 0,
    });
  });
});
