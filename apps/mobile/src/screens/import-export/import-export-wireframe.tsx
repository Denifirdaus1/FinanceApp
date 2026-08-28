import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  IMPORT_EXPORT_LAYOUT,
  createImportExportFixture,
  type ExportFormat,
  type ImportExportFixture,
} from './import-export-fixture';

export interface ImportExportWireframeProps {
  fixture?: ImportExportFixture;
  onBack?: () => void;
}

export function ImportExportWireframe({
  fixture: suppliedFixture,
  onBack,
}: ImportExportWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createImportExportFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(false);

  const act = (message: string) => setNotice(message);
  const exportPreview = fixture.exportPreview({ format, includeAttachments });

  return (
    <ScrollView
      accessibilityLabel="Import export fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Impor, ekspor &amp; backup (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Data tetap di perangkat demo; tidak ada file atau share sheet nyata.
          </Text>
        </View>
        <Button
          label="Kembali"
          variant="tertiary"
          onPress={() => onBack?.() ?? act('Kembali ke Profile fixture.')}
          accessibilityLabel="Kembali dari import export"
          style={styles.headerAction}
        />
      </View>

      <Card variant="muted" style={styles.card} accessibilityLabel="Export data fixture">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Export data
        </Text>
        <Text style={[tokens.typography.body, styles.copy, { color: tokens.colors.textSecondary }]}>
          Pilih data terotorisasi, rentang fixture, locale id-ID, timezone Asia/Jakarta, dan mata
          uang. CSV mudah dibaca; JSON memakai schema version dan checksum.
        </Text>
        <View style={styles.row}>
          <Button
            label="Preview JSON"
            variant={format === 'json' ? 'primary' : 'secondary'}
            onPress={() => {
              setFormat('json');
              setPreview(true);
            }}
            style={styles.small}
          />
          <Button
            label="Preview CSV"
            variant={format === 'csv' ? 'primary' : 'secondary'}
            onPress={() => {
              setFormat('csv');
              setPreview(true);
            }}
            style={styles.small}
          />
        </View>
        <Button
          label={includeAttachments ? 'Lepas attachment archive' : 'Sertakan attachment archive'}
          variant="secondary"
          onPress={() => {
            const next = !includeAttachments;
            setIncludeAttachments(next);
            const result = fixture.attachmentExport({ includeAttachments: next, reauthed: false });
            act(
              result.kind === 'reauth_required'
                ? 'Re-auth diperlukan sebelum attachment export.'
                : 'Attachment export tidak dipilih.',
            );
          }}
          style={styles.action}
        />
        <Button
          label="Pilih export"
          onPress={() => {
            setPreview(true);
            act(`Preview ${format.toUpperCase()} fixture dibuka.`);
          }}
          style={styles.action}
        />
        {preview ? (
          <Card style={styles.innerCard} accessibilityLabel="Export preview fixture">
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              Format: {exportPreview.format.toUpperCase()}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Schema {exportPreview.schemaVersion} · checksum fixture · row bucket kecil
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              UTF-8 · locale id-ID · timezone Asia/Jakarta · data terotorisasi saja
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              File tidak terenkripsi setelah dibagikan. Formula diperlakukan sebagai teks.
            </Text>
            {includeAttachments ? (
              <>
                <Button
                  label="Konfirmasi re-auth attachment"
                  variant="secondary"
                  onPress={() =>
                    act(
                      `Attachment ${fixture.attachmentExport({ includeAttachments: true, reauthed: true }).kind}.`,
                    )
                  }
                  style={styles.action}
                />
                <Button
                  label="Masukkan password fixture"
                  variant="secondary"
                  onPress={() =>
                    act(
                      `Attachment ${fixture.attachmentExport({ includeAttachments: true, reauthed: true, passwordProvided: true }).kind}; TTL dan quota aktif.`,
                    )
                  }
                  style={styles.action}
                />
              </>
            ) : null}
            <Button
              label="Preview safe share/download"
              variant="secondary"
              onPress={() =>
                act('Safe share/download preview dibuka; OS share sheet tidak dipanggil.')
              }
              style={styles.action}
            />
            <Button
              label="Simpan preview export"
              variant="secondary"
              onPress={() =>
                act('Export async fixture selesai; temporary result dibersihkan setelah expiry.')
              }
              style={styles.action}
            />
            <Button
              label="Batal export"
              variant="tertiary"
              onPress={() => {
                setPreview(false);
                act('Export dibatalkan dan temporary fixture dibersihkan.');
              }}
              style={styles.action}
            />
          </Card>
        ) : null}
      </Card>

      <Card variant="muted" style={styles.card} accessibilityLabel="Import data fixture">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Import CSV
        </Text>
        <Text style={[tokens.typography.body, styles.copy, { color: tokens.colors.textSecondary }]}>
          File profile, delimiter, mapping, parsing exact, duplicate review, dry-run, dan bounded
          batch ditampilkan sebagai fixture.
        </Text>
        <Button
          label="Pilih file import"
          onPress={() => act('File fixture dipilih; belum diproses.')}
          style={styles.action}
        />
        <Button
          label="Deteksi format file"
          variant="secondary"
          onPress={() =>
            act(`Format ${fixture.inspectFile().delimiter}, ${fixture.inspectFile().encoding}.`)
          }
          style={styles.action}
        />
        <Button
          label="Tampilkan preview import"
          variant="secondary"
          onPress={() =>
            act(
              `Preview: ${fixture.previewRows().validCount} valid, ${fixture.previewRows().errorCount} perlu diperiksa.`,
            )
          }
          style={styles.action}
        />
        <Button
          label="Mulai dry-run"
          variant="secondary"
          onPress={() => act(`Dry-run ${fixture.dryRun().kind}; tidak ada data disimpan.`)}
          style={styles.action}
        />
        <Button
          label="Konfirmasi import"
          onPress={() =>
            act(`Import ${fixture.confirmImport().kind}; commit production tidak dijalankan.`)
          }
          style={styles.action}
        />
        <Button
          label="Batalkan operasi"
          variant="tertiary"
          onPress={() => act(`Operasi dibatalkan; local purge=${fixture.cancel().localPurged}.`)}
          style={styles.action}
        />
      </Card>

      <Card variant="muted" style={styles.card} accessibilityLabel="Recovery and privacy fixture">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Recovery &amp; privacy
        </Text>
        <Text style={[tokens.typography.body, styles.copy, { color: tokens.colors.textSecondary }]}>
          Offline menahan commit, retry memakai mutation yang sama, dan privacy export hanya
          mencakup data berizin. Penghapusan akun diteruskan ke jalur privacy fixture; bukan
          penghapusan nyata.
        </Text>
        <Button
          label="Buka privacy handoff"
          variant="secondary"
          onPress={() =>
            act(`Privacy handoff ${fixture.privacyDeletionHandoff().route} fixture dibuka.`)
          }
          style={styles.action}
        />
        <Button
          label="Tampilkan diagnostic aman"
          variant="secondary"
          onPress={() => act('Diagnostic hanya kode dan bucket timing; payload tidak disertakan.')}
          style={styles.action}
        />
        <Button
          label="Coba lagi operasi"
          variant="tertiary"
          onPress={() => act(`Recovery ${fixture.retry('fixture-mutation').kind}; idempotent.`)}
          style={styles.action}
        />
        <Button
          label="Lanjutkan batch fixture"
          variant="secondary"
          onPress={() =>
            act(
              `Batch ${fixture.progress().committedCount} committed, ${fixture.progress().rejectedCount} rejected; resume idempotent.`,
            )
          }
          style={styles.action}
        />
      </Card>

      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Minimum {IMPORT_EXPORT_LAYOUT.minimumWidth}dp · target sentuh{' '}
        {IMPORT_EXPORT_LAYOUT.minimumTouchTarget}dp · preview tanpa file I/O
      </Text>
      {reducedMotion ? (
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Animasi dikurangi sesuai preferensi perangkat.
        </Text>
      ) : null}
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.primary }]}
        >
          {notice}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: IMPORT_EXPORT_LAYOUT.maximumContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1 },
  headerAction: { minWidth: IMPORT_EXPORT_LAYOUT.minimumTouchTarget },
  card: { marginTop: 16 },
  innerCard: { marginTop: 12 },
  copy: { marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  small: { flexGrow: 1, minWidth: IMPORT_EXPORT_LAYOUT.minimumTouchTarget },
  action: { marginTop: 10 },
  notice: { marginTop: 12 },
});
