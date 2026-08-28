import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { AiInsightsWireframe } from '../ai-insights-wireframe';
import {
  createAiInsightsFixture,
  type AssistantScenario,
  type InsightPeriod,
} from '../ai-insights-fixture';

jest.setTimeout(30000);

describe('U24 F21 AI insights and financial assistant wireframe', () => {
  it('connects F21 to authenticated Reports and manifest', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F21')).toMatchObject({
      routeId: 'insights',
      path: '/reports/insights',
      navigationGroup: 'reports',
      tab: 'reports',
      readiness: 'WIREFRAME READY',
    });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/reports/insights' });
    expect(await routerScreen.findByText('AI insights & assistant (fixture)')).toBeTruthy();
  });

  it('keeps AI off by default and exposes consent disclosure and alternatives', () => {
    const fixture = createAiInsightsFixture();
    expect(fixture.consentSnapshot()).toMatchObject({ enabled: false, processingActive: false });
    expect(fixture.disclosure()).toEqual(
      expect.objectContaining({
        dataProcessed: 'aggregated financial facts only',
        purpose: expect.any(String),
        retention: '30_days_or_local_only',
        providerClass: 'provider-neutral fixture',
        alternative: 'deterministic reports',
      }),
    );
    expect(fixture.setConsent(true)).toMatchObject({ enabled: true, processingActive: true });
    expect(fixture.setConsent(false)).toMatchObject({ enabled: false, processingActive: false });
  });

  it('renders weekly and monthly deterministic facts before AI narrative', () => {
    const fixture = createAiInsightsFixture('consented');
    const periods: InsightPeriod[] = ['weekly', 'monthly'];
    for (const period of periods) {
      expect(fixture.insights(period)).toMatchObject({
        period,
        factsFirst: true,
        aiGenerated: true,
        sourceReference: expect.any(String),
        whyThis: expect.any(String),
      });
    }
    expect(fixture.insights('weekly').facts.map((fact) => fact.key)).toEqual([
      'income',
      'expense',
      'savings',
      'budget_variance',
      'recurring_change',
      'anomaly',
    ]);
    expect(fixture.insights('weekly').uncertainty).toEqual(expect.any(String));
  });

  it('keeps offline snapshots and missing data honest', () => {
    expect(createAiInsightsFixture('offline').insights('weekly')).toMatchObject({
      offline: true,
      generativeProcessing: false,
      deterministicSnapshot: true,
    });
    expect(createAiInsightsFixture('missing_data').insights('monthly')).toMatchObject({
      incomplete: true,
      uncertainty: expect.any(String),
      fabricated: false,
    });
  });

  it('requires household and time range scope confirmation before assistant tools', () => {
    const fixture = createAiInsightsFixture('consented');
    expect(fixture.assistantScope()).toMatchObject({
      confirmed: false,
      household: 'current',
      timeRange: 'needs_confirmation',
    });
    expect(fixture.confirmScope({ household: 'current', timeRange: 'this_month' })).toMatchObject({
      confirmed: true,
      safe: true,
    });
    expect(fixture.allowlistedTools()).toEqual([
      'get_cashflow_summary',
      'get_budget_variance',
      'get_recurring_changes',
      'search_transactions_summary',
      'get_net_worth_trend',
    ]);
  });

  it('returns typed sourced facts and blocks unsafe or unsupported requests', () => {
    const fixture = createAiInsightsFixture('consented');
    fixture.confirmScope({ household: 'current', timeRange: 'this_month' });
    expect(fixture.ask('How did spending change?')).toMatchObject({
      kind: 'sourced_answer',
      numericGrounded: true,
      sourceReferences: expect.any(Array),
      readOnly: true,
    });
    expect(fixture.unsupportedAdvice('buy the best stock')).toMatchObject({
      kind: 'safety_refusal',
      autonomousAction: false,
      alternative: 'deterministic reports',
    });
    expect(createAiInsightsFixture('prompt_injection').ask('merchant text')).toMatchObject({
      kind: 'untrusted_data',
      policyChanged: false,
      toolChanged: false,
    });
  });

  it.each([
    ['timeout', 'timeout'],
    ['provider_outage', 'provider_outage'],
    ['rate_limited', 'rate_limited'],
    ['quota_exceeded', 'cost_quota'],
    ['unsafe_output', 'unsafe_output'],
    ['access_error', 'access_error'],
    ['kill_switch', 'kill_switch'],
    ['revoked', 'consent_revoked'],
  ] as [AssistantScenario, string][])(
    'handles %s with deterministic safe recovery',
    (scenario, kind) => {
      expect(createAiInsightsFixture(scenario).ask('safe question')).toMatchObject({
        kind,
        fallbackAvailable: true,
        networkCalled: false,
      });
    },
  );

  it('supports feedback, clear, retention choice, revoke/delete, and safe draft handoff', () => {
    const fixture = createAiInsightsFixture('consented');
    expect(fixture.retentionChoice('local_only')).toMatchObject({ retention: 'local_only' });
    expect(fixture.feedback('helpful')).toMatchObject({ kind: 'recorded', rating: 'helpful' });
    expect(fixture.draftAction('budget')).toMatchObject({
      destination: '/budgets',
      requiresConfirmation: true,
      autoSaved: false,
    });
    expect(fixture.draftAction('category')).toMatchObject({
      destination: '/categories',
      requiresConfirmation: true,
    });
    expect(fixture.draftAction('rule')).toMatchObject({
      destination: '/categories',
      requiresConfirmation: true,
    });
    expect(fixture.clearConversation()).toMatchObject({ cleared: true, localOnly: true });
    expect(fixture.revokeConsent()).toMatchObject({
      processingStopped: true,
      deletionStarted: true,
    });
    expect(fixture.deleteAssistantData()).toMatchObject({ requested: true, serverCalled: false });
  });

  it('masks privacy output and keeps analytics safe', () => {
    const fixture = createAiInsightsFixture('privacy_masked');
    expect(fixture.maskValue('Rp1.000.000')).toBe('••••');
    expect(fixture.analyticsMetadata()).toMatchObject({
      promptIncluded: false,
      responseIncluded: false,
      amountsIncluded: false,
      sourceIdsIncluded: false,
    });
    expect(JSON.stringify(fixture.safeRoute('insights'))).not.toMatch(
      /amount|merchant|source|identifier|prompt/i,
    );
  });

  it('renders accessible fixture controls and every action has a visible result', () => {
    render(
      <ThemeProvider reducedMotion>
        <AiInsightsWireframe fixture={createAiInsightsFixture()} />
      </ThemeProvider>,
    );
    for (const label of [
      'Buka disclosure AI',
      'Aktifkan consent AI',
      'Pilih insight bulanan',
      'Konfirmasi scope household',
      'Kirim pertanyaan fixture',
      'Tolak saran berisiko',
      'Simpan draft budget',
      'Feedback membantu',
      'Bersihkan percakapan',
      'Cabut consent AI',
      'Buka laporan deterministik',
    ]) {
      fireEvent.press(screen.getAllByRole('button', { name: label })[0]!);
    }
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/320dp/)).toBeTruthy();
    expect(screen.getByText(/Animasi dikurangi/)).toBeTruthy();
  });

  it('does not call network or logging and preserves safe refusal behavior', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const fixture = createAiInsightsFixture('consented');
    render(
      <ThemeProvider>
        <AiInsightsWireframe fixture={fixture} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Kirim pertanyaan fixture' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(fixture.safeRoute('assistant')).toMatchObject({ containsSensitiveData: false });
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('covers fallback navigation, privacy toggle, weekly selection, and recovery callbacks', () => {
    const onBack = jest.fn();
    const onOpenReport = jest.fn();
    render(
      <ThemeProvider>
        <AiInsightsWireframe
          fixture={createAiInsightsFixture('privacy_masked')}
          onBack={onBack}
          onOpenReport={onOpenReport}
        />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Kembali dari AI insights' }));
    fireEvent.press(screen.getByRole('button', { name: 'Insight mingguan' }));
    fireEvent.press(screen.getByRole('button', { name: 'Tampilkan nilai fixture' }));
    fireEvent.press(screen.getAllByRole('button', { name: 'Buka laporan deterministik' })[0]!);
    fireEvent.press(screen.getAllByRole('button', { name: 'Cabut consent AI' })[0]!);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onOpenReport).toHaveBeenCalledTimes(1);

    render(
      <ThemeProvider>
        <AiInsightsWireframe fixture={createAiInsightsFixture('ready')} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getAllByRole('button', { name: 'Buka laporan deterministik' })[0]!);
    fireEvent.press(screen.getByRole('button', { name: 'Kembali dari AI insights' }));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });
});
