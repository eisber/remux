export interface KeepAliveSocketLike {
  OPEN: number;
  readyState: number;
  send(payload: string): void;
}

export interface WebSocketKeepAliveOptions {
  intervalMs: number;
  createPayload: () => string;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}

export const attachWebSocketKeepAlive = (
  socket: KeepAliveSocketLike,
  options: WebSocketKeepAliveOptions,
): (() => void) => {
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const timer = setIntervalFn(() => {
    if (socket.readyState !== socket.OPEN) {
      return;
    }
    socket.send(options.createPayload());
  }, options.intervalMs);

  return () => {
    clearIntervalFn(timer);
  };
};
