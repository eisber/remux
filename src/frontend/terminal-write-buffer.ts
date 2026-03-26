export interface TerminalWriteBuffer {
  clear(): void;
  enqueue(chunk: string): void;
  flush(): void;
}

export const createTerminalWriteBuffer = (
  write: (chunk: string) => void,
  requestFrame: (callback: () => void) => number = (callback) => requestAnimationFrame(callback),
  cancelFrame: (id: number) => void = (id) => cancelAnimationFrame(id)
): TerminalWriteBuffer => {
  let pending = "";
  let frameId: number | null = null;

  const runFlush = (): void => {
    frameId = null;
    if (!pending) {
      return;
    }
    const chunk = pending;
    pending = "";
    write(chunk);
  };

  return {
    clear(): void {
      pending = "";
      if (frameId !== null) {
        cancelFrame(frameId);
        frameId = null;
      }
    },
    enqueue(chunk: string): void {
      if (!chunk) {
        return;
      }
      pending += chunk;
      if (frameId !== null) {
        return;
      }
      frameId = requestFrame(runFlush);
    },
    flush(): void {
      if (frameId !== null) {
        cancelFrame(frameId);
        frameId = null;
      }
      runFlush();
    }
  };
};
