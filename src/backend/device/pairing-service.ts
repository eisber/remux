/**
 * Device pairing service.
 *
 * Manages the QR-based pairing flow for native clients.
 * Skeleton — real crypto and expiry logic will be added later.
 */

import { randomUUID } from "node:crypto";
import type { PairingState } from "../../shared/contracts/device.js";

const DEFAULT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export class PairingService {
  private readonly pairings = new Map<string, PairingState>();

  /** Create a new pairing code with expiry. */
  createPairing(): PairingState {
    const code = randomUUID().slice(0, 8).toUpperCase();
    const state: PairingState = {
      status: "pending",
      pairingCode: code,
      expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString(),
    };
    this.pairings.set(code, state);
    return state;
  }

  /** Attempt to complete pairing with a code. */
  completePairing(code: string, deviceId: string): PairingState | null {
    const state = this.pairings.get(code);
    if (!state) return null;
    if (state.status !== "pending") return state;
    if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
      state.status = "expired";
      return state;
    }
    state.status = "paired";
    state.deviceId = deviceId;
    return state;
  }

  /** Revoke a pairing. */
  revoke(code: string): void {
    const state = this.pairings.get(code);
    if (state) {
      state.status = "revoked";
    }
  }

  /** Clean up expired pairings. */
  pruneExpired(): number {
    let pruned = 0;
    for (const [code, state] of this.pairings) {
      if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
        this.pairings.delete(code);
        pruned++;
      }
    }
    return pruned;
  }
}
