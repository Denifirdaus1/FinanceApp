import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { VoiceCommandWireframe } from '../voice-command-wireframe';
import {
  VOICE_LAYOUT,
  createVoiceFixture,
  parseIndonesianVoice,
  validateVoiceDraft,
  type VoiceDraft,
  type VoiceScenario,
} from '../voice-fixture';

jest.setTimeout(30000);

function renderVoice(scenario?: VoiceScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <VoiceCommandWireframe fixture={createVoiceFixture(scenario)} />
    </ThemeProvider>,
  );
}

const validDraft: VoiceDraft = {
  direction: 'expense',
  amountMinor: '50000',
  accountId: 'account-gopay-fixture',
  categoryId: 'category-food',
  occurredAt: '2026-08-25T10:00:00.000Z',
  timezone: 'Asia/Jakarta',
  merchant: 'makan',
  note: '',
  tagIds: [],
};

describe('U11 F08 voice command wireframe', () => {
  it('connects F08 route and capture handoff without changing auth guard', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F08')).toMatchObject({
      routeId: 'voice-capture',
      path: '/voice-capture',
      navigationGroup: 'transactions',
      readiness: 'WIREFRAME READY',
    });
    expect(VOICE_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/voice-capture' });
    expect(await routerScreen.findByText('Voice command (fixture)')).toBeTruthy();
  });

  it('requires true on-device capability and provides safe permission/manual fallback', () => {
    expect(createVoiceFixture().checkCapability('id-ID')).toMatchObject({
      supported: true,
      trueOnDevice: true,
    });
    expect(createVoiceFixture('on_device_unavailable').checkCapability('id-ID')).toMatchObject({
      supported: false,
      trueOnDevice: false,
    });
    expect(createVoiceFixture('permission_required').requestPermission()).toMatchObject({
      kind: 'permission_required',
    });
    expect(createVoiceFixture('permission_denied').requestPermission()).toMatchObject({
      kind: 'denied',
      manualFallback: true,
    });
    expect(createVoiceFixture('on_device_unavailable').manualFallback()).toMatchObject({
      route: '/capture',
      production: false,
    });
  });

  it('models listening lifecycle, interruption, silence retry, and no audio storage', () => {
    expect(createVoiceFixture().startListening()).toMatchObject({
      kind: 'listening',
      onDevice: true,
      audioStored: false,
    });
    expect(createVoiceFixture('listening').partialTranscript()).toMatchObject({
      kind: 'partial_transcript',
      draftCreated: false,
      audioStored: false,
    });
    expect(createVoiceFixture('processing').processTranscript()).toMatchObject({
      kind: 'processing',
      audioStored: false,
    });
    expect(createVoiceFixture('interrupted').handleInterruption()).toMatchObject({
      kind: 'interrupted',
      structuredDraftRetained: true,
      audioStored: false,
    });
    expect(createVoiceFixture('silence').retrySilence()).toMatchObject({
      kind: 'listening',
      retryCount: 1,
      draftCreated: false,
    });
    expect(createVoiceFixture('silence').retrySilence().retryCount).toBe(1);
  });

  it('parses Indonesian amounts, direction, entities, and relative date deterministically', () => {
    expect(
      parseIndonesianVoice('keluar lima puluh ribu buat makan dari GoPay kemarin'),
    ).toMatchObject({
      kind: 'parsed',
      draft: {
        direction: 'expense',
        amountMinor: '50000',
        accountId: 'account-gopay-fixture',
        categoryId: 'category-food',
        timezone: 'Asia/Jakarta',
      },
    });
    expect(parseIndonesianVoice('masuk satu juta dari gaji hari ini')).toMatchObject({
      kind: 'parsed',
      draft: { direction: 'income', amountMinor: '1000000' },
    });
    expect(parseIndonesianVoice('keluar satu koma lima juta')).toMatchObject({
      kind: 'needs_clarification',
      reason: 'amount_ambiguous',
    });
    expect(parseIndonesianVoice('keluar dua ribu dari akun misterius')).toMatchObject({
      kind: 'needs_clarification',
      reason: 'entity_no_match',
    });
    expect(validateVoiceDraft(validDraft)).toMatchObject({ ok: true, requiresReview: true });
    expect(validateVoiceDraft({ ...validDraft, amountMinor: '0' })).toMatchObject({ ok: false });
    expect(validateVoiceDraft({ ...validDraft, amountMinor: '1.5' })).toMatchObject({ ok: false });
  });

  it('keeps ambiguity and entity resolution explicit', () => {
    expect(createVoiceFixture('ambiguous_direction').resolveEntities()).toMatchObject({
      kind: 'needs_clarification',
      reason: 'direction_ambiguous',
    });
    expect(createVoiceFixture('ambiguous_date').resolveEntities()).toMatchObject({
      kind: 'needs_clarification',
      reason: 'date_ambiguous',
    });
    expect(createVoiceFixture('alias_collision').resolveEntities()).toMatchObject({
      kind: 'picker_required',
      autoSelected: false,
    });
    expect(createVoiceFixture('archived_entity').resolveEntities()).toMatchObject({
      kind: 'picker_required',
      reason: 'archived_entity',
    });
    expect(createVoiceFixture('ready').fuzzySuggestion()).toMatchObject({
      kind: 'suggestion',
      autoSelected: false,
    });
    expect(createVoiceFixture().chooseEntity('account-gopay-fixture')).toMatchObject({
      kind: 'selected',
      canSaveAlias: true,
    });
    expect(createVoiceFixture().saveAlias(false)).toMatchObject({ kind: 'selection_required' });
    expect(createVoiceFixture().saveAlias(true)).toMatchObject({ kind: 'alias_fixture_saved' });
  });

  it('requires explicit review and keeps confirmation offline/idempotent', () => {
    const fixture = createVoiceFixture();
    expect(fixture.confirm(validDraft, false)).toMatchObject({
      kind: 'review_required',
      autoPosted: false,
    });
    expect(fixture.confirm(validDraft, true)).toMatchObject({
      kind: 'saved_fixture',
      transactionCreated: true,
      autoPosted: false,
      transcriptPurged: true,
      audioStored: false,
      idempotent: true,
    });
    expect(fixture.confirm(validDraft, true)).toEqual(fixture.confirm(validDraft, true));
    expect(createVoiceFixture('offline').confirm(validDraft, true)).toMatchObject({
      kind: 'saved_fixture',
      syncState: 'offline_fixture',
    });
    expect(createVoiceFixture().cancel()).toMatchObject({
      kind: 'cancelled',
      transcriptPurged: true,
      audioStored: false,
      transactionCreated: false,
    });
    expect(createVoiceFixture('listening').copyPartialToNote()).toMatchObject({
      kind: 'note_fixture',
      persisted: false,
    });
  });

  it('covers unavailable, permission, revoked, read-only, and kill-switch outcomes', () => {
    const cases: [VoiceScenario, string][] = [
      ['checking_capability', 'capability_check'],
      ['permission_required', 'permission_required'],
      ['permission_denied', 'permission_denied'],
      ['unavailable', 'unavailable'],
      ['parser_error', 'parser_error'],
      ['permission_revoked', 'permission_revoked'],
      ['read_only', 'read_only'],
      ['kill_switch', 'manual_only'],
    ];
    for (const [scenario, state] of cases) {
      expect(createVoiceFixture(scenario).status().state).toBe(state);
    }
    expect(createVoiceFixture('permission_revoked').manualFallback()).toMatchObject({
      route: '/capture',
      production: false,
    });
    expect(createVoiceFixture('kill_switch').manualFallback()).toMatchObject({
      route: '/capture',
      production: false,
    });
  });

  it('renders states and live actions with accessibility, reduced motion, and narrow layout', () => {
    const scenarios: VoiceScenario[] = [
      'ready',
      'checking_capability',
      'permission_required',
      'permission_denied',
      'listening',
      'processing',
      'interrupted',
      'silence',
      'offline',
      'ambiguous_amount',
      'alias_collision',
      'archived_entity',
      'permission_revoked',
      'read_only',
      'kill_switch',
    ];
    for (const scenario of scenarios) {
      const rendered = renderVoice(scenario);
      expect(screen.getByText('Voice command (fixture)')).toBeTruthy();
      expect(screen.getByText(/100% on-device/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Use manual entry' })).toBeTruthy();
      expect(screen.getByText(/Minimum width 320dp/)).toBeTruthy();
      rendered.unmount();
    }
  });

  it('supports review field editing, save-as-note, manual fallback, and back preservation', () => {
    const onBack = jest.fn();
    render(
      <ThemeProvider reducedMotion={false}>
        <VoiceCommandWireframe onBack={onBack} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Push to talk' }));
    fireEvent.press(screen.getByRole('button', { name: 'Stop listening' }));
    expect(screen.getByText('Periksa hasil suara sebelum menyimpan')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Merchant'), 'Kedai fixture');
    fireEvent.changeText(screen.getByLabelText('Amount minor unit'), '50000');
    fireEvent.press(screen.getByRole('button', { name: 'Save as manual note' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Confirm voice transaction' }));
    expect(screen.getByText('Voice result detail (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to voice capture' }));
    expect(screen.getByText('Voice command (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does not use network/logging or expose transcript, amount, or entity data in navigation', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = createVoiceFixture().confirm(validDraft, true);
    expect(result).not.toHaveProperty('transcript');
    expect(result).not.toHaveProperty('audioPath');
    expect(result).not.toHaveProperty('accountId');
    renderVoice();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
