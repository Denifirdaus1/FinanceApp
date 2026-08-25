import { AnalyticsPolicyError } from './analytics-policy';
import { SafeAnalyticsClient } from './safe-analytics-client';

describe('safe analytics client', () => {
  it('validates the event before forwarding it to the sink', async () => {
    const sink = { send: jest.fn(async () => undefined) };
    const client = new SafeAnalyticsClient(sink);
    await client.track('privacy_mode_changed', { enabled: true });
    expect(sink.send).toHaveBeenCalledWith('privacy_mode_changed', { enabled: true });
  });

  it('never calls the sink for a rejected payload', async () => {
    const sink = { send: jest.fn(async () => undefined) };
    const client = new SafeAnalyticsClient(sink);
    await expect(
      client.track('privacy_mode_changed', { enabled: true, amount: 1000 }),
    ).rejects.toBeInstanceOf(AnalyticsPolicyError);
    expect(sink.send).not.toHaveBeenCalled();
  });
});
