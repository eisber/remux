/**
 * Device identity persistence.
 *
 * Stores known device identities on the server side.
 * This is a skeleton — real persistence (file or DB) will be added later.
 */

import type { DeviceIdentity } from "../../shared/contracts/device.js";

export class DeviceIdentityStore {
  private readonly devices = new Map<string, DeviceIdentity>();

  get(deviceId: string): DeviceIdentity | undefined {
    return this.devices.get(deviceId);
  }

  upsert(identity: DeviceIdentity): void {
    this.devices.set(identity.deviceId, {
      ...identity,
      lastSeenAt: new Date().toISOString(),
    });
  }

  list(): DeviceIdentity[] {
    return [...this.devices.values()];
  }

  remove(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }
}
