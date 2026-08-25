export interface PrivacySnapshot {
  readonly locked: boolean;
  readonly privacyModeEnabled: boolean;
}

export class PrivacyFacade {
  private locked = true;
  private privacyModeEnabled = true;

  snapshot(): PrivacySnapshot {
    return Object.freeze({
      locked: this.locked,
      privacyModeEnabled: this.privacyModeEnabled,
    });
  }

  lock(): void {
    this.locked = true;
  }

  unlock(): void {
    this.locked = false;
  }

  setPrivacyMode(enabled: boolean): void {
    this.privacyModeEnabled = enabled;
  }

  onAppStateChange(state: 'active' | 'background' | 'inactive'): void {
    if (state !== 'active') {
      this.lock();
    }
  }

  canRevealSensitiveData(): boolean {
    return !this.locked && !this.privacyModeEnabled;
  }
}
