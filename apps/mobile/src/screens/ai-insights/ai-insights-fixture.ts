export const AI_INSIGHTS_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export const AI_ALLOWED_TOOLS = [
  'get_cashflow_summary',
  'get_budget_variance',
  'get_recurring_changes',
  'search_transactions_summary',
  'get_net_worth_trend',
] as const;

export type AiInsightScenario =
  | 'ready'
  | 'consent_required'
  | 'consented'
  | 'offline'
  | 'missing_data'
  | 'timeout'
  | 'provider_outage'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'unsafe_output'
  | 'access_error'
  | 'prompt_injection'
  | 'kill_switch'
  | 'revoked'
  | 'privacy_masked';

export type AssistantScenario = Exclude<
  AiInsightScenario,
  'ready' | 'consent_required' | 'consented' | 'offline' | 'missing_data' | 'privacy_masked'
>;
export type InsightPeriod = 'weekly' | 'monthly';
export type RetentionChoice = '30_days' | 'local_only';
export type FeedbackRating = 'helpful' | 'not_helpful' | 'incorrect';
export type DraftAction = 'budget' | 'category' | 'rule';

export interface AiDisclosure {
  dataProcessed: 'aggregated financial facts only';
  purpose: string;
  retention: '30_days_or_local_only';
  providerClass: 'provider-neutral fixture';
  alternative: 'deterministic reports';
  rawReceiptAudioNotesExcluded: true;
}

export interface ConsentSnapshot {
  enabled: boolean;
  processingActive: boolean;
  defaultOff: true;
  deletionAvailable: true;
}

export interface InsightFact {
  key: 'income' | 'expense' | 'savings' | 'budget_variance' | 'recurring_change' | 'anomaly';
  valueBucket: 'fixture_bucket';
  sourceReference: 'deterministic_aggregate';
  exactValueMasked: true;
}

export interface InsightSnapshot {
  period: InsightPeriod;
  factsFirst: true;
  aiGenerated: true;
  facts: InsightFact[];
  whyThis: string;
  sourceReference: 'deterministic_aggregate';
  uncertainty: string;
  incomplete: boolean;
  offline: boolean;
  deterministicSnapshot: boolean;
  generativeProcessing: boolean;
  fabricated: false;
}

export type AssistantResult =
  | {
      kind: 'sourced_answer';
      numericGrounded: true;
      sourceReferences: string[];
      readOnly: true;
      fallbackAvailable: true;
      networkCalled: false;
    }
  | {
      kind: 'safety_refusal';
      autonomousAction: false;
      alternative: 'deterministic reports';
      fallbackAvailable: true;
      networkCalled: false;
    }
  | {
      kind: 'untrusted_data';
      policyChanged: false;
      toolChanged: false;
      fallbackAvailable: true;
      networkCalled: false;
    }
  | { kind: 'consent_required'; fallbackAvailable: true; networkCalled: false }
  | { kind: 'offline'; fallbackAvailable: true; networkCalled: false }
  | {
      kind:
        | 'timeout'
        | 'provider_outage'
        | 'rate_limited'
        | 'cost_quota'
        | 'unsafe_output'
        | 'access_error'
        | 'kill_switch'
        | 'consent_revoked';
      fallbackAvailable: true;
      networkCalled: false;
    };

const INSIGHT_KEYS: InsightFact['key'][] = [
  'income',
  'expense',
  'savings',
  'budget_variance',
  'recurring_change',
  'anomaly',
];

function createFacts(): InsightFact[] {
  return INSIGHT_KEYS.map((key) => ({
    key,
    valueBucket: 'fixture_bucket',
    sourceReference: 'deterministic_aggregate',
    exactValueMasked: true,
  }));
}

function assistantKind(scenario: AiInsightScenario): AssistantResult['kind'] {
  switch (scenario) {
    case 'timeout':
      return 'timeout';
    case 'provider_outage':
      return 'provider_outage';
    case 'rate_limited':
      return 'rate_limited';
    case 'quota_exceeded':
      return 'cost_quota';
    case 'unsafe_output':
      return 'unsafe_output';
    case 'access_error':
      return 'access_error';
    case 'kill_switch':
      return 'kill_switch';
    case 'revoked':
      return 'consent_revoked';
    case 'offline':
      return 'offline';
    case 'consent_required':
    case 'ready':
      return 'consent_required';
    default:
      return 'sourced_answer';
  }
}

export function createAiInsightsFixture(scenario: AiInsightScenario = 'ready') {
  let consentEnabled = scenario === 'consented';
  let retention: RetentionChoice = '30_days';
  let scopeConfirmed = false;
  return {
    scenario,
    disclosure(): AiDisclosure {
      return {
        dataProcessed: 'aggregated financial facts only',
        purpose: 'Menjelaskan pola keuangan dengan sumber yang dapat ditinjau.',
        retention: '30_days_or_local_only',
        providerClass: 'provider-neutral fixture',
        alternative: 'deterministic reports',
        rawReceiptAudioNotesExcluded: true,
      };
    },
    consentSnapshot(): ConsentSnapshot {
      return {
        enabled: consentEnabled,
        processingActive: consentEnabled && scenario !== 'revoked',
        defaultOff: true,
        deletionAvailable: true,
      };
    },
    setConsent(enabled: boolean): ConsentSnapshot {
      consentEnabled = enabled;
      return this.consentSnapshot();
    },
    revokeConsent() {
      consentEnabled = false;
      return {
        processingStopped: true as const,
        deletionStarted: true as const,
        networkCalled: false as const,
      };
    },
    deleteAssistantData() {
      return {
        requested: true as const,
        serverCalled: false as const,
        localFixtureCleared: true as const,
      };
    },
    retentionChoice(choice: RetentionChoice) {
      retention = choice;
      return { retention, localOnly: choice === 'local_only' };
    },
    insights(period: InsightPeriod): InsightSnapshot {
      const offline = scenario === 'offline';
      const incomplete = scenario === 'missing_data';
      return {
        period,
        factsFirst: true,
        aiGenerated: true,
        facts: createFacts(),
        whyThis: 'Dipilih dari perubahan agregat pada periode yang dikonfirmasi.',
        sourceReference: 'deterministic_aggregate',
        uncertainty: incomplete
          ? 'Sebagian data belum tersedia; periksa laporan deterministik.'
          : 'Tidak ada klaim di luar sumber fixture.',
        incomplete,
        offline,
        deterministicSnapshot: true,
        generativeProcessing: !offline && consentEnabled && scenario !== 'kill_switch',
        fabricated: false,
      };
    },
    assistantScope() {
      return {
        confirmed: scopeConfirmed,
        household: 'current' as const,
        timeRange: scopeConfirmed ? ('this_month' as const) : ('needs_confirmation' as const),
      };
    },
    confirmScope(input: { household: 'current'; timeRange: 'this_month' | 'last_month' }) {
      scopeConfirmed = input.household === 'current';
      return {
        confirmed: scopeConfirmed,
        safe: true as const,
        timeRangeConfirmed: input.timeRange,
      };
    },
    allowlistedTools(): readonly string[] {
      return [...AI_ALLOWED_TOOLS];
    },
    ask(_question: string): AssistantResult {
      if (scenario === 'prompt_injection')
        return {
          kind: 'untrusted_data',
          policyChanged: false,
          toolChanged: false,
          fallbackAvailable: true,
          networkCalled: false,
        };
      if (scenario === 'consented' && scopeConfirmed)
        return {
          kind: 'sourced_answer',
          numericGrounded: true,
          sourceReferences: ['deterministic_aggregate'],
          readOnly: true,
          fallbackAvailable: true,
          networkCalled: false,
        };
      const kind = assistantKind(scenario);
      if (kind === 'sourced_answer')
        return {
          kind: 'sourced_answer',
          numericGrounded: true,
          sourceReferences: ['deterministic_aggregate'],
          readOnly: true,
          fallbackAvailable: true,
          networkCalled: false,
        };
      if (kind === 'consent_required')
        return { kind, fallbackAvailable: true, networkCalled: false };
      if (kind === 'offline') return { kind, fallbackAvailable: true, networkCalled: false };
      if (kind === 'safety_refusal')
        return {
          kind,
          autonomousAction: false,
          alternative: 'deterministic reports',
          fallbackAvailable: true,
          networkCalled: false,
        };
      if (kind === 'untrusted_data')
        return {
          kind,
          policyChanged: false,
          toolChanged: false,
          fallbackAvailable: true,
          networkCalled: false,
        };
      return { kind, fallbackAvailable: true, networkCalled: false };
    },
    unsupportedAdvice(_question: string) {
      return {
        kind: 'safety_refusal' as const,
        autonomousAction: false as const,
        alternative: 'deterministic reports' as const,
        fallbackAvailable: true as const,
      };
    },
    feedback(rating: FeedbackRating) {
      return { kind: 'recorded' as const, rating, analyticsSafe: true as const };
    },
    clearConversation() {
      return { cleared: true as const, localOnly: true as const, networkCalled: false as const };
    },
    draftAction(action: DraftAction) {
      return {
        action,
        destination: action === 'budget' ? ('/budgets' as const) : ('/categories' as const),
        requiresConfirmation: true as const,
        autoSaved: false as const,
      };
    },
    analyticsMetadata() {
      return {
        promptIncluded: false as const,
        responseIncluded: false as const,
        amountsIncluded: false as const,
        sourceIdsIncluded: false as const,
        modelVersionBucket: 'fixture',
        latencyBucket: 'short',
      };
    },
    maskValue(_value: string) {
      return '••••' as const;
    },
    safeRoute(_target: 'insights' | 'assistant') {
      return { route: '/reports/insights' as const, containsSensitiveData: false as const };
    },
  };
}

export type AiInsightsFixture = ReturnType<typeof createAiInsightsFixture>;
