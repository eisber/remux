/**
 * Push notification registration service.
 *
 * Manages device push token registration for native clients.
 * Skeleton — integrates with the existing NotificationManager later.
 */

export interface PushRegistration {
  deviceId: string;
  platform: "ios" | "android" | "web";
  pushToken: string;
  registeredAt: string;
}

export class PushRegistrationService {
  private readonly registrations = new Map<string, PushRegistration>();

  register(deviceId: string, platform: PushRegistration["platform"], pushToken: string): PushRegistration {
    const reg: PushRegistration = {
      deviceId,
      platform,
      pushToken,
      registeredAt: new Date().toISOString(),
    };
    this.registrations.set(deviceId, reg);
    return reg;
  }

  unregister(deviceId: string): boolean {
    return this.registrations.delete(deviceId);
  }

  getRegistration(deviceId: string): PushRegistration | undefined {
    return this.registrations.get(deviceId);
  }

  listByPlatform(platform: PushRegistration["platform"]): PushRegistration[] {
    return [...this.registrations.values()].filter((r) => r.platform === platform);
  }

  listAll(): PushRegistration[] {
    return [...this.registrations.values()];
  }
}
