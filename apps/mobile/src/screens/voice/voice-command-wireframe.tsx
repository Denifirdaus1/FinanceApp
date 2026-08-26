import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  VOICE_LAYOUT,
  VOICE_SAMPLE_TRANSCRIPT,
  createVoiceFixture,
  validateVoiceDraft,
  type VoiceDraft,
  type VoiceFixture,
} from './voice-fixture';

type VoiceView = 'source' | 'listening' | 'review' | 'detail';

export interface VoiceCommandWireframeProps {
  fixture?: VoiceFixture;
  onBack?: () => void;
  onOpenManualEntry?: () => void;
}

function stateLabel(state: string): string {
  const labels: Record<string, string> = {
    capability_check: 'Memeriksa kemampuan on-device',
    permission_required: 'Izin mikrofon diperlukan',
    ready: 'Siap mendengar',
    listening: 'Mendengarkan',
    partial_transcript: 'Transkrip parsial',
    processing: 'Memproses secara lokal',
    needs_clarification: 'Perlu klarifikasi',
    review: 'Perlu diperiksa',
    saving: 'Menyimpan fixture lokal',
    cancelled: 'Dibatalkan',
    unavailable: 'Recognizer on-device tidak tersedia',
    error: 'Terjadi kesalahan fixture',
    parser_error: 'Parser lokal gagal',
    offline: 'Offline — tetap on-device',
    interrupted: 'Terhenti sementara',
    silence: 'Tidak ada suara',
    permission_denied: 'Izin mikrofon ditolak',
    permission_revoked: 'Akses dicabut',
    read_only: 'Hanya baca',
    manual_only: 'Manual-only fixture',
  };
  return labels[state] ?? 'Status fixture';
}

function draftCopy(fixture: VoiceFixture): VoiceDraft {
  return fixture.draft();
}

export function VoiceCommandWireframe({
  fixture: suppliedFixture,
  onBack,
  onOpenManualEntry,
}: VoiceCommandWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createVoiceFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<VoiceView>('source');
  const [draft, setDraft] = useState<VoiceDraft>(() => draftCopy(fixture));
  const [notice, setNotice] = useState('');

  const manualFallback = () => {
    const result = fixture.manualFallback();
    setNotice(
      `Input manual tersedia di ${result.route}; fixture tidak menganggap pengguna sudah login.`,
    );
    onOpenManualEntry?.();
  };

  const start = () => {
    const capability = fixture.checkCapability('id-ID');
    if (!capability.supported) {
      setNotice(
        'Recognizer on-device tidak tersedia untuk id-ID. Buka Settings atau gunakan input manual.',
      );
      return;
    }
    const permission = fixture.requestPermission();
    if (permission.kind !== 'granted') {
      setNotice('Izin mikrofon diminta saat push-to-talk; gunakan Settings atau input manual.');
      return;
    }
    const result = fixture.startListening();
    setNotice(
      result.kind === 'listening'
        ? 'Listening fixture aktif; audio tidak disimpan.'
        : 'Listening tidak tersedia; gunakan input manual.',
    );
    if (result.kind === 'listening') setView('listening');
  };

  const stop = () => {
    fixture.partialTranscript();
    fixture.processTranscript();
    setDraft(draftCopy(fixture));
    setNotice('Hasil terstruktur lokal siap diperiksa; tidak ada auto-post.');
    setView('review');
  };

  const confirm = () => {
    const result = fixture.confirm(draft, true);
    if (result.kind === 'saved_fixture') {
      setNotice(
        'Transaksi fixture dibuat sekali; transcript dipurge dan audio tidak pernah disimpan.',
      );
      setView('detail');
    } else {
      setNotice('Periksa kembali field sebelum konfirmasi.');
    }
  };

  const renderHeader = (title: string, backLabel: string, backAction: () => void) => (
    <View style={styles.header}>
      <Button label={backLabel} variant="tertiary" onPress={backAction} />
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      {reducedMotion ? (
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Reduced motion
        </Text>
      ) : null}
    </View>
  );

  const renderSource = () => (
    <>
      <View style={styles.header}>
        <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
          Voice command (fixture)
        </Text>
        {onBack ? <Button label="Back" variant="tertiary" onPress={onBack} /> : null}
      </View>
      <Card variant="raised" style={styles.card} accessibilityLabel="Voice capability status">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          {stateLabel(fixture.status().state)}
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          100% on-device Phase 2 untuk locale id-ID. Tidak ada cloud fallback atau LLM.
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Transcript hanya fixture session dan dipurge saat cancel/save.
        </Text>
        <Button
          label="Check capability"
          onPress={() =>
            setNotice(
              fixture.checkCapability('id-ID').supported
                ? 'True on-device capability tersedia.'
                : 'Capability tidak tersedia; gunakan manual fallback.',
            )
          }
        />
        <Button label="Push to talk" variant="secondary" onPress={start} />
        <Button label="Use manual entry" variant="tertiary" onPress={manualFallback} />
        <Button
          label="Copy partial to note"
          variant="tertiary"
          onPress={() =>
            setNotice(
              fixture.copyPartialToNote().kind === 'note_fixture'
                ? 'Catatan fixture dibuat di sesi lokal; tidak dipersist.'
                : 'Catatan belum tersedia.',
            )
          }
        />
      </Card>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
    </>
  );

  const renderListening = () => (
    <>
      {renderHeader('Listening (fixture)', 'Back to voice capture', () => setView('source'))}
      <Card variant="raised" style={styles.card} accessibilityLabel="Listening state">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Listening — on-device
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Tekan stop setelah selesai. Maksimal 30 detik fixture; audio buffer tidak ditulis.
        </Text>
        <Text
          accessibilityRole="text"
          style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}
        >
          Partial transcript: {VOICE_SAMPLE_TRANSCRIPT}
        </Text>
        <Button label="Stop listening" onPress={stop} />
        <Button
          label="Simulate interruption"
          variant="secondary"
          onPress={() => {
            fixture.handleInterruption();
            setNotice(
              'Interruption fixture menghentikan listening dan mempertahankan structured draft.',
            );
            setView('review');
          }}
        />
        <Button
          label="Retry silence"
          variant="tertiary"
          onPress={() =>
            setNotice(
              fixture.retrySilence().kind === 'listening'
                ? 'Retry silence ke-1 aktif; draft kosong tidak dibuat.'
                : 'Retry tidak tersedia.',
            )
          }
        />
      </Card>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
    </>
  );

  const renderReview = () => (
    <>
      {renderHeader('Voice review', 'Back to voice capture', () => setView('source'))}
      <Card variant="raised" style={styles.card}>
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Periksa hasil suara sebelum menyimpan
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Dibuat dari suara · hasil perlu diperiksa · belum menjadi transaksi.
        </Text>
        <Input
          label="Direction"
          value={draft.direction}
          onChangeText={(direction) =>
            setDraft((current) => ({ ...current, direction: direction as VoiceDraft['direction'] }))
          }
        />
        <Input
          label="Account"
          value={draft.accountId === 'account-gopay-fixture' ? 'GoPay' : 'Cash'}
          onChangeText={(account) => setDraft((current) => ({ ...current, accountId: account }))}
        />
        <Input
          label="Category"
          value={draft.categoryId === 'category-food' ? 'Makan' : 'Income'}
          onChangeText={(category) => setDraft((current) => ({ ...current, categoryId: category }))}
        />
        <Input
          label="Occurred date/time"
          value={draft.occurredAt}
          onChangeText={(occurredAt) => setDraft((current) => ({ ...current, occurredAt }))}
        />
        <Input
          label="Timezone"
          value={draft.timezone}
          onChangeText={(timezone) => setDraft((current) => ({ ...current, timezone }))}
        />
        <Input
          label="Merchant"
          value={draft.merchant}
          onChangeText={(merchant) => setDraft((current) => ({ ...current, merchant }))}
        />
        <Input
          label="Amount minor unit"
          value={draft.amountMinor}
          keyboardType="number-pad"
          onChangeText={(amountMinor) => setDraft((current) => ({ ...current, amountMinor }))}
        />
        <Input
          label="Note"
          value={draft.note}
          onChangeText={(note) => setDraft((current) => ({ ...current, note }))}
        />
        <Input
          label="Tags"
          value={draft.tagIds.join(', ')}
          onChangeText={(tags) =>
            setDraft((current) => ({
              ...current,
              tagIds: tags ? tags.split(',').map((tag) => tag.trim()) : [],
            }))
          }
        />
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Tipe: {draft.direction} · account/category fixture dapat dikoreksi · timezone:{' '}
          {draft.timezone}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Ambiguity dan confidence selalu diberi label, bukan hanya warna.
        </Text>
        <Button
          label="Save as manual note"
          variant="tertiary"
          onPress={() =>
            setNotice(
              fixture.copyPartialToNote().kind === 'note_fixture'
                ? 'Partial transcript dipindahkan ke catatan manual fixture.'
                : 'Catatan belum tersedia.',
            )
          }
        />
        <Button label="Confirm voice transaction" onPress={confirm} />
        <Button
          label="Cancel voice capture"
          variant="tertiary"
          onPress={() => {
            fixture.cancel();
            setNotice('Capture dibatalkan; transcript fixture dipurge dan tidak ada entry.');
            setView('source');
          }}
        />
      </Card>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
    </>
  );

  const renderDetail = () => (
    <>
      {renderHeader('Voice result detail (fixture)', 'Back', () => setView('source'))}
      <Card variant="raised" style={styles.card}>
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Structured fixture result
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Transaction draft created once after explicit confirmation. Raw transcript and audio are
          unavailable.
        </Text>
        <Button label="Back to voice capture" onPress={() => setView('source')} />
        <Button label="Use manual entry" variant="secondary" onPress={manualFallback} />
      </Card>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
    </>
  );

  // Keep the validation call close to the editor so the fixture contract is visible to maintainers.
  validateVoiceDraft(draft);
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {view === 'source' ? renderSource() : null}
      {view === 'listening' ? renderListening() : null}
      {view === 'review' ? renderReview() : null}
      {view === 'detail' ? renderDetail() : null}
      <Text
        style={[
          tokens.typography.caption,
          styles.layoutHint,
          { color: tokens.colors.textSecondary },
        ]}
      >
        Minimum width {VOICE_LAYOUT.minimumWidth}dp · touch target {VOICE_LAYOUT.minimumTouchTarget}
        dp
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
    maxWidth: VOICE_LAYOUT.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: 8 },
  card: { gap: 12 },
  notice: { paddingVertical: 8 },
  layoutHint: { paddingTop: 8 },
});
