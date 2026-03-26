import { describe, expect, test, vi } from "vitest";
import { createTerminalWriteBuffer } from "../../src/frontend/terminal-write-buffer.js";

describe("terminal write buffer", () => {
  test("coalesces multiple writes into a single frame flush", () => {
    const writes: string[] = [];
    let callback: (() => void) | null = null;
    const requestFrame = vi.fn((cb: () => void) => {
      callback = cb;
      return 1;
    });
    const cancelFrame = vi.fn();
    const buffer = createTerminalWriteBuffer((chunk) => writes.push(chunk), requestFrame, cancelFrame);

    buffer.enqueue("hello ");
    buffer.enqueue("world");

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(writes).toEqual([]);

    callback?.();
    expect(writes).toEqual(["hello world"]);
  });

  test("clear cancels the pending frame and drops buffered data", () => {
    const writes: string[] = [];
    const requestFrame = vi.fn(() => 7);
    const cancelFrame = vi.fn();
    const buffer = createTerminalWriteBuffer((chunk) => writes.push(chunk), requestFrame, cancelFrame);

    buffer.enqueue("stale");
    buffer.clear();
    buffer.flush();

    expect(cancelFrame).toHaveBeenCalledWith(7);
    expect(writes).toEqual([]);
  });
});
