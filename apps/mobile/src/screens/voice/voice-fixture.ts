export const VOICE_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

export const VOICE_LOCALE = 'id-ID' as const;
export const VOICE_TIMEZONE = 'Asia/Jakarta' as const;
export const VOICE_SAMPLE_TRANSCRIPT =
  'keluar lima puluh ribu buat makan dari GoPay kemarin' as const;

export type VoiceScenario =
  | 'checking_capability'
  | 'permission_required'
  | 'ready'
  | 'listening'
  | 'partial'
  | 'processing'
  | 'needs_clarification'
  | 'review'
  | 'saving'
  | 'cancelled'
  | 'unavailable'
  | 'error'
  | 'offline'
  | 'interrupted'
  | 'silence'
  | 'permission_denied'
  | 'on_device_unavailable'
  | 'parser_error'
  | 'ambiguous_amount'
  | 'ambiguous_direction'
  | 'ambiguous_date'
  | 'alias_collision'
  | 'archived_entity'
  | 'permission_revoked'
  | 'read_only'
  | 'kill_switch';

export type VoiceState =
  | 'capability_check'
  | 'permission_required'
  | 'ready'
  | 'listening'
  | 'partial_transcript'
  | 'processing'
  | 'needs_clarification'
  | 'review'
  | 'saving'
  | 'cancelled'
  | 'unavailable'
  | 'error'
  | 'parser_error'
  | 'offline'
  | 'interrupted'
  | 'silence'
  | 'permission_denied'
  | 'permission_revoked'
  | 'read_only'
  | 'manual_only';

export type VoiceDirection = 'expense' | 'income';

export interface VoiceDraft {
  direction: VoiceDirection;
  amountMinor: string;
  accountId?: string;
  categoryId?: string;
  occurredAt: string;
  timezone: string;
  merchant: string;
  note: string;
  tagIds: string[];
}

export interface VoiceStatus {
  state: VoiceState;
  trueOnDevice: boolean;
  locale: string;
  audioStored: false;
  transcriptTtl: 'session_only';
}

function stateFor(scenario: VoiceScenario): VoiceState {
  if (scenario === 'checking_capability') return 'capability_check';
  if (scenario === 'permission_required') return 'permission_required';
  if (scenario === 'permission_denied') return 'permission_denied';
  if (scenario === 'on_device_unavailable' || scenario === 'unavailable') return 'unavailable';
  if (scenario === 'parser_error') return 'parser_error';
  if (scenario === 'error') return 'error';
  if (
    scenario === 'ambiguous_amount' ||
    scenario === 'ambiguous_direction' ||
    scenario === 'ambiguous_date' ||
    scenario === 'alias_collision' ||
    scenario === 'archived_entity' ||
    scenario === 'needs_clarification'
  )
    return 'needs_clarification';
  if (scenario === 'listening') return 'listening';
  if (scenario === 'partial') return 'partial_transcript';
  if (scenario === 'processing') return 'processing';
  if (scenario === 'review') return 'review';
  if (scenario === 'saving') return 'saving';
  if (scenario === 'cancelled') return 'cancelled';
  if (scenario === 'offline') return 'offline';
  if (scenario === 'interrupted') return 'interrupted';
  if (scenario === 'silence') return 'silence';
  if (scenario === 'permission_revoked') return 'permission_revoked';
  if (scenario === 'read_only') return 'read_only';
  if (scenario === 'kill_switch') return 'manual_only';
  return 'ready';
}

function parseAmount(text: string): string | undefined {
  if (text.includes('lima puluh ribu')) return '50000';
  if (text.includes('dua ribu')) return '2000';
  if (text.includes('seribu')) return '1000';
  if (text.includes('satu juta')) return '1000000';
  if (text.includes('lima juta')) return '5000000';
  const match = text.match(/(\d[\d.]*)\s*(ribu|juta|miliar)?/u);
  if (!match) return undefined;
  const digits = (match[1] ?? '').replaceAll('.', '');
  if (!/^\d+$/u.test(digits)) return undefined;
  const multiplier =
    match[2] === 'ribu'
      ? 1000n
      : match[2] === 'juta'
        ? 1000000n
        : match[2] === 'miliar'
          ? 1000000000n
          : 1n;
  return (BigInt(digits) * multiplier).toString();
}

export type VoiceParseResult =
  | { kind: 'parsed'; draft: VoiceDraft; onDevice: true }
  | {
      kind: 'needs_clarification';
      reason: 'amount_ambiguous' | 'direction_ambiguous' | 'date_ambiguous' | 'entity_no_match';
      candidates?: string[];
    }
  | { kind: 'parser_error'; reason: 'empty_transcript' | 'amount_missing' };

export function parseIndonesianVoice(transcript: string): VoiceParseResult {
  const normalized = transcript.trim().toLowerCase();
  if (!normalized) return { kind: 'parser_error', reason: 'empty_transcript' };
  if (normalized.includes('satu koma lima juta')) {
    return {
      kind: 'needs_clarification',
      reason: 'amount_ambiguous',
      candidates: ['1500000', '150000000'],
    };
  }
  const expense = /\b(keluar|pengeluaran|beli|bayar)\b/u.test(normalized);
  const income = /\b(masuk|pemasukan|terima|gaji)\b/u.test(normalized);
  if (expense === income) return { kind: 'needs_clarification', reason: 'direction_ambiguous' };
  if (normalized.includes('akun misterius')) {
    return { kind: 'needs_clarification', reason: 'entity_no_match' };
  }
  const amountMinor = parseAmount(normalized);
  if (!amountMinor) return { kind: 'parser_error', reason: 'amount_missing' };
  const occurredAt = normalized.includes('kemarin')
    ? '2026-08-25T10:00:00.000Z'
    : '2026-08-26T10:00:00.000Z';
  const direction: VoiceDirection = expense ? 'expense' : 'income';
  return {
    kind: 'parsed',
    onDevice: true,
    draft: {
      direction,
      amountMinor,
      accountId: normalized.includes('gopay') ? 'account-gopay-fixture' : 'account-cash-fixture',
      categoryId: normalized.includes('makan') ? 'category-food' : 'category-income',
      occurredAt,
      timezone: VOICE_TIMEZONE,
      merchant: normalized.includes('makan') ? 'makan' : normalized.includes('gaji') ? 'gaji' : '',
      note: '',
      tagIds: [],
    },
  };
}

export function validateVoiceDraft(
  draft: VoiceDraft,
):
  | { ok: true; requiresReview: true }
  | { ok: false; reason: 'amount' | 'date' | 'direction' | 'entity' } {
  if (!/^[0-9]+$/u.test(draft.amountMinor)) return { ok: false, reason: 'amount' };
  try {
    const amount = BigInt(draft.amountMinor);
    if (amount <= 0n || amount > 9000000000000000n) return { ok: false, reason: 'amount' };
  } catch {
    return { ok: false, reason: 'amount' };
  }
  if (!draft.occurredAt || Number.isNaN(Date.parse(draft.occurredAt)))
    return { ok: false, reason: 'date' };
  if (draft.direction !== 'expense' && draft.direction !== 'income')
    return { ok: false, reason: 'direction' };
  if (!draft.accountId || !draft.categoryId) return { ok: false, reason: 'entity' };
  return { ok: true, requiresReview: true };
}

export function createVoiceFixture(scenario: VoiceScenario = 'ready') {
  const draft = (): VoiceDraft => ({
    direction: 'expense',
    amountMinor: '50000',
    accountId: 'account-gopay-fixture',
    categoryId: 'category-food',
    occurredAt: '2026-08-25T10:00:00.000Z',
    timezone: VOICE_TIMEZONE,
    merchant: 'makan',
    note: '',
    tagIds: [],
  });
  const status = (): VoiceStatus => ({
    state: stateFor(scenario),
    trueOnDevice:
      scenario !== 'on_device_unavailable' &&
      scenario !== 'unavailable' &&
      scenario !== 'kill_switch',
    locale: VOICE_LOCALE,
    audioStored: false,
    transcriptTtl: 'session_only',
  });
  const checkCapability = (locale: string) => ({
    kind: 'capability_checked' as const,
    locale,
    supported: locale === VOICE_LOCALE && status().trueOnDevice,
    trueOnDevice: locale === VOICE_LOCALE && status().trueOnDevice,
    preferOfflineIsNotCapability: true,
  });
  const requestPermission = () => {
    if (scenario === 'permission_required')
      return { kind: 'permission_required' as const, requestedJustInTime: true };
    if (scenario === 'permission_denied') return { kind: 'denied' as const, manualFallback: true };
    if (!status().trueOnDevice) return { kind: 'unavailable' as const, manualFallback: true };
    return { kind: 'granted' as const, requestedJustInTime: true };
  };
  const startListening = () => {
    if (scenario === 'permission_denied')
      return {
        kind: 'permission_denied' as const,
        manualFallback: true,
        audioStored: false as const,
      };
    if (!status().trueOnDevice)
      return { kind: 'unavailable' as const, manualFallback: true, audioStored: false as const };
    return {
      kind: 'listening' as const,
      onDevice: true as const,
      audioStored: false as const,
      maxSeconds: 30,
    };
  };
  return {
    scenario,
    draft,
    status,
    checkCapability,
    requestPermission,
    startListening,
    partialTranscript: () => ({
      kind: 'partial_transcript' as const,
      transcript: VOICE_SAMPLE_TRANSCRIPT.slice(0, 24),
      draftCreated: false,
      audioStored: false as const,
    }),
    processTranscript: () => ({
      kind: 'processing' as const,
      onDevice: true as const,
      audioStored: false as const,
    }),
    handleInterruption: () => ({
      kind: 'interrupted' as const,
      structuredDraftRetained: true,
      transcriptRetained: true,
      audioStored: false as const,
    }),
    retrySilence: () => ({
      kind: 'listening' as const,
      retryCount: 1,
      draftCreated: false,
      audioStored: false as const,
    }),
    resolveEntities: () => {
      if (scenario === 'ambiguous_direction')
        return { kind: 'needs_clarification' as const, reason: 'direction_ambiguous' as const };
      if (scenario === 'ambiguous_date')
        return { kind: 'needs_clarification' as const, reason: 'date_ambiguous' as const };
      if (scenario === 'alias_collision')
        return {
          kind: 'picker_required' as const,
          reason: 'alias_collision' as const,
          autoSelected: false,
        };
      if (scenario === 'archived_entity')
        return {
          kind: 'picker_required' as const,
          reason: 'archived_entity' as const,
          autoSelected: false,
        };
      return { kind: 'resolved' as const, autoSelected: true };
    },
    fuzzySuggestion: () => ({
      kind: 'suggestion' as const,
      autoSelected: false,
      requiresChoice: true,
    }),
    chooseEntity: (entityId: string) => ({
      kind: 'selected' as const,
      entityId,
      canSaveAlias: true,
    }),
    saveAlias: (entityChosen: boolean) =>
      entityChosen
        ? { kind: 'alias_fixture_saved' as const, persisted: false }
        : { kind: 'selection_required' as const },
    confirm: (value: VoiceDraft, confirmed: boolean) => {
      const validation = validateVoiceDraft(value);
      if (!confirmed || !validation.ok)
        return { kind: 'review_required' as const, autoPosted: false, draftRetained: true };
      if (
        scenario === 'permission_revoked' ||
        scenario === 'read_only' ||
        scenario === 'kill_switch'
      )
        return { kind: 'read_only' as const, autoPosted: false, draftRetained: true };
      return {
        kind: 'saved_fixture' as const,
        transactionCreated: true,
        autoPosted: false,
        transcriptPurged: true,
        audioStored: false as const,
        idempotent: true,
        syncState:
          scenario === 'offline' ? ('offline_fixture' as const) : ('local_fixture' as const),
      };
    },
    cancel: () => ({
      kind: 'cancelled' as const,
      transcriptPurged: true,
      audioStored: false as const,
      transactionCreated: false,
    }),
    copyPartialToNote: () => ({
      kind: 'note_fixture' as const,
      persisted: false,
      source: 'partial_transcript' as const,
    }),
    manualFallback: () => ({
      route: '/capture' as const,
      production: false as const,
      transcriptPurged: true,
      resultVisible: true,
    }),
  };
}

export type VoiceFixture = ReturnType<typeof createVoiceFixture>;
