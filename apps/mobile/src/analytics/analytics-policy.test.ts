import {
  AnalyticsPolicyError,
  createAnalyticsEvent,
  redactDiagnosticContext,
} from './analytics-policy';

describe('analytics policy', () => {
  it('allows only a known event with its exact low-sensitivity properties', () => {
    expect(
      createAnalyticsEvent('app_boot_completed', {
        offline: true,
        recovery: 'key_loss',
      }),
    ).toEqual({
      name: 'app_boot_completed',
      properties: { offline: true, recovery: 'key_loss' },
    });
  });

  it.each([
    ['amountMinor', 125000],
    ['merchantName', 'Toko Rahasia'],
    ['receiptImageBase64', 'raw-image'],
    ['transcript', 'beli makan dua puluh ribu'],
    ['audioUri', 'file:///voice.m4a'],
  ])('prohibits financial or raw capture property %s', (key, value) => {
    expect(() =>
      createAnalyticsEvent('app_boot_completed', {
        offline: true,
        recovery: 'none',
        [key]: value,
      }),
    ).toThrow(AnalyticsPolicyError);
  });

  it('rejects unknown events and unknown properties by default', () => {
    expect(() => createAnalyticsEvent('transaction_created', {})).toThrow(AnalyticsPolicyError);
    expect(() =>
      createAnalyticsEvent('privacy_mode_changed', { enabled: true, debug: 'extra' }),
    ).toThrow(AnalyticsPolicyError);
  });

  it('redacts sensitive diagnostic fields recursively without mutating input', () => {
    const input = {
      route: 'activity',
      nested: {
        token: 'secret-token',
        note: 'private note',
        safeCode: 'DB_CORRUPTED',
      },
    };
    expect(redactDiagnosticContext(input)).toEqual({
      route: 'activity',
      nested: {
        token: '[REDACTED]',
        note: '[REDACTED]',
        safeCode: 'DB_CORRUPTED',
      },
    });
    expect(input.nested.token).toBe('secret-token');
  });
});
