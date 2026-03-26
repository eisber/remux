/**
 * Device trust store.
 *
 * Tracks which devices are trusted for reconnection without re-auth.
 * Skeleton — real persistence will be added later.
 */

import type { TrustState } from "../../shared/contracts/device.js";

export class DeviceTrustStore {
  private readonly trusts = new Map<string, TrustState>();

  /** Grant trust to a device. */
  grant(deviceId: string): TrustState {
    const state: TrustState = {
      trusted: true,
      deviceId,
      grantedAt: new Date().toISOString(),
    };
    this.trusts.set(deviceId, state);
    return state;
  }

  /** Check if a device is trusted. */
  isTrusted(deviceId: string): boolean {
    const state = this.trusts.get(deviceId);
    if (!state) return false;
    if (!state.trusted) return false;
    if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
      state.trusted = false;
      return false;
    }
    return true;
  }

  /** Revoke trust for a device. */
  revoke(deviceId: string): void {
    const state = this.trusts.get(deviceId);
    if (state) {
      state.trusted = false;
    }
  }

  /** List all trust entries. */
  list(): TrustState[] {
    return [...this.trusts.values()];
  }
}
