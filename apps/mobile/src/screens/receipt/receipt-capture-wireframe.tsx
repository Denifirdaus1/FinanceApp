import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  RECEIPT_LAYOUT,
  createReceiptFixture,
  receiptStateLabel,
  type ReceiptDraft,
  type ReceiptFixture,
  type ReceiptSource,
} from './receipt-fixture';

type ReceiptView = 'source' | 'preprocess' | 'review' | 'detail';

export interface ReceiptCaptureWireframeProps {
  fixture?: ReceiptFixture;
  onBack?: () => void;
}

function sourceLabel(source: ReceiptSource): string {
  if (source === 'camera') return 'Camera';
  if (source === 'gallery') return 'System photo picker';
  return 'PDF fallback';
}

export function ReceiptCaptureWireframe({
  fixture: suppliedFixture,
  onBack,
}: ReceiptCaptureWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createReceiptFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<ReceiptView>('source');
  const [source, setSource] = useState<ReceiptSource>();
  const [draft, setDraft] = useState<ReceiptDraft>(() => fixture.draft());
  const [notice, setNotice] = useState('');

  const chooseSource = (nextSource: ReceiptSource) => {
    const result = fixture.chooseSource(nextSource);
    setSource(nextSource);
    if (result.kind === 'unsupported') {
      setNotice('PDF belum mendukung OCR; gunakan foto atau input manual.');
      return;
    }
    if (result.kind === 'permission_prompt') {
      const permission = fixture.requestCameraPermission();
      setNotice(
        permission.kind === 'allowed'
          ? 'Camera permission diminta just-in-time; lanjutkan ke preprocess.'
          : 'Camera tidak tersedia; gunakan system photo picker atau manual.',
      );
      return;
    }
    setNotice('System photo picker fixture terbuka; akses galeri luas tidak diminta.');
  };

  const confirmReceipt = () => {
    const result = fixture.confirm(draft, true);
    setNotice(
      result.kind === 'confirmed'
        ? result.attachment
          ? 'Transaksi dibuat lebih dahulu; gambar receipt upload_pending fixture.'
          : 'Transaksi fixture dikonfirmasi; attachment null dan image lokal dipurge.'
        : 'Periksa kembali field ber-confidence rendah atau arithmetic mismatch.',
    );
    if (result.kind === 'confirmed') setView('detail');
  };

  const renderHeader = (
    title: string,
    label = 'Back to capture',
    action = () => setView('source'),
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

  const renderSource = () => (
    <>
      <View style={styles.header}>
        <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
          Receipt capture (fixture)
        </Text>
        {onBack ? <Button label="Back" variant="tertiary" onPress={onBack} /> : null}
      </View>
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
          {receiptStateLabel(fixture.status.state)}
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          OCR 100% on-device. Tidak ada cloud fallback dan tidak ada upload pada tahap ini.
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Sumber terpilih: {source ? sourceLabel(source) : 'belum dipilih'}
        </Text>
        <Button label="Choose camera" onPress={() => chooseSource('camera')} />
        <Button
          label="Choose gallery"
          variant="secondary"
          onPress={() => chooseSource('gallery')}
        />
        <Button
          label="Choose PDF fallback"
          variant="secondary"
          onPress={() => chooseSource('pdf')}
        />
        <Button
          label="Use manual fallback"
          variant="tertiary"
          onPress={() =>
            setNotice('Input manual fixture siap; tidak ada OCR atau file yang dikirim.')
          }
        />
        <Button label="Continue to preprocess" onPress={() => setView('preprocess')} />
      </Card>
      {fixture.status.state === 'permission_denied' ? (
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Permission kamera ditolak. System photo picker tersedia tanpa broad gallery permission.
          </Text>
          <Button
            label="Retake photo"
            onPress={() => setNotice('Retake fixture siap setelah permission ditinjau ulang.')}
          />
        </Card>
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

  const renderPreprocess = () => (
    <>
      {renderHeader('Preprocess & OCR (fixture)')}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Working image maksimal 2.048 px; pilihan asli tidak ditimpa.
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Pipeline on-device: crop, rotate, perspective, contrast.
        </Text>
        <View style={styles.buttonRow}>
          <Button
            label="Crop"
            variant="secondary"
            onPress={() => setNotice(fixture.preprocess('crop').step)}
          />
          <Button
            label="Rotate"
            variant="secondary"
            onPress={() => setNotice(fixture.preprocess('rotate').step)}
          />
          <Button
            label="Perspective"
            variant="secondary"
            onPress={() => setNotice(fixture.preprocess('perspective').step)}
          />
          <Button
            label="Contrast"
            variant="secondary"
            onPress={() => setNotice(fixture.preprocess('contrast').step)}
          />
        </View>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Progress: preprocessing → recognizing → parsing
        </Text>
        <Button
          label="Run recognizing"
          onPress={() => setNotice(fixture.ocrProgress('recognizing').kind)}
        />
        <Button label="Continue to review" onPress={() => setView('review')} />
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

  const renderReview = () => {
    const review = fixture.reviewState();
    return (
      <>
        {renderHeader('Hasil scan — periksa kembali')}
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
            Thumbnail lokal placeholder · hasil normalized extraction
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Confidence: {review.confidenceCue}. Cue tidak hanya warna.
          </Text>
          {review.requiresCorrection ? (
            <Text
              accessibilityRole="alert"
              style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}
            >
              Confidence rendah: koreksi wajib sebelum confirm.
            </Text>
          ) : null}
          {review.arithmeticMismatch ? (
            <Text
              accessibilityRole="alert"
              style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}
            >
              Arithmetic mismatch: subtotal − discount + tax/service tidak sama dengan total.
            </Text>
          ) : null}
          <Input
            label="Merchant"
            value={draft.merchant}
            onChangeText={(merchant) => setDraft((current) => ({ ...current, merchant }))}
          />
          <Input
            label="Total minor unit"
            value={draft.totalMinor}
            onChangeText={(totalMinor) => setDraft((current) => ({ ...current, totalMinor }))}
            keyboardType="number-pad"
          />
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Tanggal: {draft.purchasedAt} · account/category/tag fixture editable setelah review.
          </Text>
          <Button
            label={draft.keepImage ? 'Simpan gambar struk: ON' : 'Simpan gambar struk: OFF'}
            variant="secondary"
            onPress={() => setDraft((current) => ({ ...current, keepImage: !current.keepImage }))}
          />
          <Button label="Confirm receipt transaction" onPress={confirmReceipt} />
          <Button
            label="Cancel capture"
            variant="tertiary"
            onPress={() => {
              setNotice(
                'Capture dibatalkan; local fixture dipurge dan tidak ada transaction/attachment.',
              );
              fixture.cancel();
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
  };

  const renderDetail = () => {
    const detail = fixture.detail();
    return (
      <>
        {renderHeader('Receipt detail (fixture)', 'Back to review', () => setView('review'))}
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
            Normalized extraction terhubung ke satu transaction fixture.
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Image state: {detail.imageState}
          </Text>
          <Button
            label="Open receipt detail"
            onPress={() =>
              setNotice('Receipt detail fixture sudah terbuka; raw OCR tetap tersembunyi.')
            }
          />
          {detail.imageState === 'upload_pending' || detail.imageState === 'failed' ? (
            <Button
              label="Retry image upload"
              onPress={() => setNotice(fixture.retryUpload().kind)}
            />
          ) : null}
          {detail.imageState === 'missing' ? (
            <Button
              label="Relink receipt"
              onPress={() => setNotice(fixture.relinkAttachment(true).kind)}
            />
          ) : null}
          <Button
            label="Delete receipt image"
            variant="secondary"
            onPress={() => setNotice(fixture.deleteAttachment(true).kind)}
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
      {view === 'source' ? renderSource() : null}
      {view === 'preprocess' ? renderPreprocess() : null}
      {view === 'review' ? renderReview() : null}
      {view === 'detail' ? renderDetail() : null}
      <Text
        style={[
          tokens.typography.caption,
          styles.layoutHint,
          { color: tokens.colors.textSecondary },
        ]}
      >
        Minimum width {RECEIPT_LAYOUT.minimumWidth}dp · touch target{' '}
        {RECEIPT_LAYOUT.minimumTouchTarget}dp
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
    maxWidth: RECEIPT_LAYOUT.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: 8 },
  card: { gap: 12 },
  buttonRow: { gap: 8 },
  notice: { paddingVertical: 8 },
  layoutHint: { paddingTop: 8 },
});
