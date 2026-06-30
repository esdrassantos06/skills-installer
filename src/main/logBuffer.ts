export type LogBuffer = {
  push: (text: string) => void;
  flush: () => void;
  stop: () => void;
};

/**
 * Coalesces frequent text chunks into one flush per interval, so a chatty child
 * process does not produce one IPC message per stdout chunk. The timer only
 * runs while there is buffered content; `stop()` flushes the remainder.
 */
export function createLogBuffer(
  onFlush: (text: string) => void,
  intervalMs: number,
): LogBuffer {
  let buffer = "";
  let timer: ReturnType<typeof setInterval> | null = null;

  function flush() {
    if (!buffer) return;
    const text = buffer;
    buffer = "";
    onFlush(text);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    push(text: string) {
      buffer += text;
      if (!timer) timer = setInterval(flush, intervalMs);
    },
    flush,
    stop() {
      stopTimer();
      flush();
    },
  };
}
