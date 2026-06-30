import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogBuffer } from "../src/main/logBuffer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createLogBuffer", () => {
  it("coalesces multiple pushes into a single flush per interval", () => {
    const onFlush = vi.fn();
    const buf = createLogBuffer(onFlush, 50);
    buf.push("a");
    buf.push("b");
    buf.push("c");
    expect(onFlush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(onFlush).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("does not flush when nothing has been buffered", () => {
    const onFlush = vi.fn();
    createLogBuffer(onFlush, 50);
    vi.advanceTimersByTime(200);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("flushes each interval's accumulation separately", () => {
    const onFlush = vi.fn();
    const buf = createLogBuffer(onFlush, 50);
    buf.push("one");
    vi.advanceTimersByTime(50);
    buf.push("two");
    vi.advanceTimersByTime(50);
    expect(onFlush.mock.calls).toEqual([["one"], ["two"]]);
  });

  it("stop() flushes the remainder immediately and stops the timer", () => {
    const onFlush = vi.fn();
    const buf = createLogBuffer(onFlush, 50);
    buf.push("tail");
    buf.stop();
    expect(onFlush).toHaveBeenCalledExactlyOnceWith("tail");
    vi.advanceTimersByTime(200);
    expect(onFlush).toHaveBeenCalledOnce();
  });

  it("stop() with an empty buffer does not flush", () => {
    const onFlush = vi.fn();
    const buf = createLogBuffer(onFlush, 50);
    buf.stop();
    expect(onFlush).not.toHaveBeenCalled();
  });
});
