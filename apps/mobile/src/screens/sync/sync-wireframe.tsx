import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  SYNC_LAYOUT,
  createSyncFixture,
  syncStateLabel,
  type ConflictChoice,
  type SyncFixture,
  type SyncScenario,
} from './sync-fixture';

type SyncView = 'hub' | 'conflicts';

export interface SyncWireframeProps {
  fixture?: SyncFixture;
  onBack?: () => void;
}

function scenarioLabel(scenario: SyncScenario): string {
  if (scenario === 'empty') return 'Belum ada mutation yang menunggu.';
  if (scenario === 'loading') return 'Memuat status sync fixture…';
  if (scenario === 'local_only') return 'Tersimpan di perangkat; menunggu sync manual.';
  if (scenario === 'offline') return 'Offline: perubahan tetap tersimpan di perangkat.';
  if (scenario === 'schema_incompatible') return 'Push diblokir sampai schema aplikasi kompatibel.';
  if (scenario === 'revoked') return 'Scope terkunci karena akses dicabut; perlu policy check.';
  if (scenario === 'kill_switch' || scenario === 'manual_only')
    return 'Mode manual-only aktif; sync otomatis tidak dijalankan.';
  if (scenario === 'retry_401') return 'Sesi kedaluwarsa; re-auth diperlukan sebelum retry.';
  if (scenario === 'retry_403') return 'Akses dicabut; household scope tidak dapat dipush.';
  if (scenario === 'retry_409' || scenario === 'critical_conflict' || scenario === 'needs_review')
    return 'Perlu diperiksa: pilih versi dengan sadar.';
  if (scenario === 'retry_429') return 'Rate limit fixture: retry-after ditampilkan.';
  if (scenario === 'retry_5xx' || scenario === 'failed')
    return 'Gagal: backoff fixture siap untuk retry.';
  if (scenario === 'rollback') return 'Aggregate rollback: tidak ada perubahan parsial.';
  return 'Fixture aman: tidak ada network atau payload finansial.';
}

export function SyncWireframe({ fixture: suppliedFixture, onBack }: SyncWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createSyncFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<SyncView>('hub');
  const [notice, setNotice] = useState('');

  const runRetry = () => {
    const result = fixture.retryMutation(0);
    setNotice(result.message);
  };

  const runConflictChoice = (choice: ConflictChoice) => {
    const result = fixture.resolveConflict(choice);
    setNotice(result.message);
    setView('hub');
  };

  const renderHeader = (
    title: string,
    label = 'Back to sync hub',
    action = () => setView('hub'),
  ) => (
    <View style={styles.header}>
      <Button label={label} variant="tertiary" onPress={action} />
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

  const renderHub = () => {
    const { status } = fixture;
    const metadata = fixture.safePendingMetadata();
    return (
      <>
        <View style={styles.header}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Sinkronisasi (fixture)
          </Text>
          {onBack ? <Button label="Back" variant="tertiary" onPress={onBack} /> : null}
        </View>
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
            {syncStateLabel(status.state)}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            {scenarioLabel(fixture.scenario)}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Queue: {status.queueCount}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Last success: {status.lastSuccess}
          </Text>
          <Button label="Retry sync" onPress={runRetry} />
          <Button
            label="Review conflicts"
            variant="secondary"
            onPress={() => setView('conflicts')}
          />
        </Card>

        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Pending mutations
          </Text>
          {metadata.length === 0 ? (
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Tidak ada mutation tertunda.
            </Text>
          ) : (
            metadata.map((item, index) => (
              <View
                key={`${item.entityType}-${index}`}
                style={styles.row}
                accessible
                accessibilityRole="text"
              >
                <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
                  {item.entityType} · {item.status}
                </Text>
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                  Retry: {item.retryState} · attempts: {item.attempts} · age: {item.ageBucket}
                </Text>
              </View>
            ))
          )}
        </Card>

        {status.state === 'revoked' ? (
          <Card padding="space4" style={styles.card}>
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              Data scope terkait terkunci/inaccessible.
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Re-auth dan policy check diperlukan. Stage 1 tidak menghapus database nyata.
            </Text>
            <Button
              label="Request re-auth"
              onPress={() => setNotice(fixture.requestReauth().kind)}
            />
            <Button
              label="Purge after re-auth"
              variant="secondary"
              onPress={() => setNotice(fixture.purgeAccess(true).kind)}
            />
          </Card>
        ) : null}

        {status.state === 'schema_incompatible' ? (
          <Card padding="space4" style={styles.card}>
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              Update aplikasi atau export diagnostic aman.
            </Text>
            <Button
              label="Update app fixture"
              onPress={() => setNotice(fixture.updateApp().message)}
            />
            <Button
              label="Export safe diagnostic"
              variant="secondary"
              onPress={() => setNotice(fixture.exportDiagnostic().message)}
            />
          </Card>
        ) : null}

        {status.manualOnly ? (
          <Button
            label="Open manual sync guide"
            variant="secondary"
            onPress={() => setNotice(fixture.openManualGuide().message)}
          />
        ) : null}
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
  };

  const renderConflicts = () => {
    const review = fixture.conflictReview();
    return (
      <>
        {renderHeader('Conflict review (fixture)')}
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            {review.deviceSummary}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            {review.serverSummary}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Field: {review.fields.join(', ')} · critical:{' '}
            {review.criticalFields.join(', ') || 'none'}
          </Text>
          {review.mergeAllowed ? (
            <Button
              label="Merge non-overlapping fields"
              onPress={() => runConflictChoice('merge')}
            />
          ) : null}
          <Button
            label="Use device version"
            variant="secondary"
            onPress={() => runConflictChoice('device')}
          />
          <Button
            label="Use server version"
            variant="secondary"
            onPress={() => runConflictChoice('server')}
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
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {view === 'hub' ? renderHub() : null}
      {view === 'conflicts' ? renderConflicts() : null}
      <Text
        style={[
          tokens.typography.caption,
          styles.layoutHint,
          { color: tokens.colors.textSecondary },
        ]}
      >
        Minimum width {SYNC_LAYOUT.minimumWidth}dp · touch target {SYNC_LAYOUT.minimumTouchTarget}dp
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
    maxWidth: SYNC_LAYOUT.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: 8 },
  card: { gap: 12 },
  row: { gap: 4, paddingVertical: 8 },
  notice: { paddingVertical: 8 },
  layoutHint: { paddingTop: 8 },
});
