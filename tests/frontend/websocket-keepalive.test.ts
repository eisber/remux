import { describe, expect, test, vi } from "vitest";
import { attachWebSocketKeepAlive } from "../../src/frontend/websocket-keepalive.js";

describe("websocket keepalive", () => {
  test("sends keepalive payloads on the configured interval", () => {
    vi.useFakeTimers();
    const sends: string[] = [];
    const socket = {
      OPEN: 1,
      readyState: 1,
      send: (payload: string) => {
        sends.push(payload);
      },
    };

    const stop = attachWebSocketKeepAlive(socket, {
      intervalMs: 25_000,
      createPayload: () => JSON.stringify({ type: "ping", timestamp: 42 }),
    });

    vi.advanceTimersByTime(24_999);
    expect(sends).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(sends).toEqual(['{"type":"ping","timestamp":42}']);

    vi.advanceTimersByTime(25_000);
    expect(sends).toEqual([
      '{"type":"ping","timestamp":42}',
      '{"type":"ping","timestamp":42}',
    ]);

    stop();
    vi.useRealTimers();
  });

  test("stops sending once disposed or when the socket is no longer open", () => {
    vi.useFakeTimers();
    const sends: string[] = [];
    const socket = {
      OPEN: 1,
      readyState: 1,
      send: (payload: string) => {
        sends.push(payload);
      },
    };

    const stop = attachWebSocketKeepAlive(socket, {
      intervalMs: 10_000,
      createPayload: () => JSON.stringify({ type: "ping" }),
    });

    vi.advanceTimersByTime(10_000);
    expect(sends).toEqual(['{"type":"ping"}']);

    socket.readyState = 3;
    vi.advanceTimersByTime(10_000);
    expect(sends).toEqual(['{"type":"ping"}']);

    stop();
    socket.readyState = 1;
    vi.advanceTimersByTime(30_000);
    expect(sends).toEqual(['{"type":"ping"}']);

    vi.useRealTimers();
  });
});
