import type { DeviceIdentity, PairingSession } from "../../src/backend/auth/device-types.js";

interface MemoryStoreState {
  devices: Map<string, DeviceIdentity>;
  pairingSessions: Map<string, PairingSession>;
  metadata: Map<string, string>;
}

const storeStates = new Map<string, MemoryStoreState>();

const getState = (key: string): MemoryStoreState => {
  let state = storeStates.get(key);
  if (!state) {
    state = {
      devices: new Map<string, DeviceIdentity>(),
      pairingSessions: new Map<string, PairingSession>(),
      metadata: new Map<string, string>(),
    };
    storeStates.set(key, state);
  }
  return state;
};

export const createMemoryDeviceStore = (key = "default") => {
  const state = getState(key);

  return {
    close() {},
    listDevices(): DeviceIdentity[] {
      return [...state.devices.values()].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
    },
    getDevice(deviceId: string): DeviceIdentity | null {
      return state.devices.get(deviceId) ?? null;
    },
    saveDevice(device: DeviceIdentity): DeviceIdentity {
      state.devices.set(device.deviceId, { ...device });
      return device;
    },
    updateDeviceLastSeen(deviceId: string, lastSeenAt: string): void {
      const device = state.devices.get(deviceId);
      if (!device) {
        return;
      }
      state.devices.set(deviceId, { ...device, lastSeenAt });
    },
    revokeDevice(deviceId: string, revokedAt: string, reason: string): DeviceIdentity | null {
      const device = state.devices.get(deviceId);
      if (!device) {
        return null;
      }
      const revoked: DeviceIdentity = {
        ...device,
        trustLevel: "revoked",
        revokedAt,
        revokeReason: reason,
      };
      state.devices.set(deviceId, revoked);
      return revoked;
    },
    savePairingSession(session: PairingSession): PairingSession {
      state.pairingSessions.set(session.pairingSessionId, { ...session });
      return session;
    },
    getPairingSession(pairingSessionId: string): PairingSession | null {
      return state.pairingSessions.get(pairingSessionId) ?? null;
    },
    markPairingSessionRedeemed(
      pairingSessionId: string,
      redeemedBy: string,
      redeemedAt: string,
    ): PairingSession | null {
      const session = state.pairingSessions.get(pairingSessionId);
      if (!session) {
        return null;
      }
      const updated: PairingSession = {
        ...session,
        redeemed: true,
        redeemedBy,
        redeemedAt,
      };
      state.pairingSessions.set(pairingSessionId, updated);
      return updated;
    },
    markExpiredPairingSessions(nowIso: string): number {
      let changes = 0;
      for (const [pairingSessionId, session] of state.pairingSessions.entries()) {
        if (session.redeemed || session.expiredAt || session.expiresAt > nowIso) {
          continue;
        }
        state.pairingSessions.set(pairingSessionId, {
          ...session,
          expiredAt: nowIso,
        });
        changes += 1;
      }
      return changes;
    },
    getOrCreateMetadata(key: string, factory: () => string): string {
      if (!state.metadata.has(key)) {
        state.metadata.set(key, factory());
      }
      return state.metadata.get(key) as string;
    },
  };
};

export const clearMemoryDeviceStore = (key: string): void => {
  storeStates.delete(key);
};
