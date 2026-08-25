import { createAnalyticsEvent } from './analytics-policy';

export interface AnalyticsSink {
  send(name: string, properties: Readonly<Record<string, boolean | string>>): Promise<void>;
}

export class SafeAnalyticsClient {
  constructor(private readonly sink: AnalyticsSink) {}

  async track(name: string, properties: unknown): Promise<void> {
    const event = createAnalyticsEvent(name, properties);
    await this.sink.send(event.name, event.properties);
  }
}
