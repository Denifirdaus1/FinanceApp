import { PrivacyFacade } from './privacy-facade';

describe('app lock and privacy mode facade', () => {
  it('starts locked and never reveals sensitive values until explicitly unlocked', () => {
    const privacy = new PrivacyFacade();
    expect(privacy.snapshot()).toEqual({ locked: true, privacyModeEnabled: true });
    expect(privacy.canRevealSensitiveData()).toBe(false);
  });

  it('requires both an unlocked app and disabled privacy mode to reveal data', () => {
    const privacy = new PrivacyFacade();
    privacy.unlock();
    expect(privacy.canRevealSensitiveData()).toBe(false);
    privacy.setPrivacyMode(false);
    expect(privacy.canRevealSensitiveData()).toBe(true);
  });

  it('locks immediately when the application leaves the foreground', () => {
    const privacy = new PrivacyFacade();
    privacy.setPrivacyMode(false);
    privacy.unlock();
    privacy.onAppStateChange('background');
    expect(privacy.snapshot().locked).toBe(true);
    expect(privacy.canRevealSensitiveData()).toBe(false);
  });
});
