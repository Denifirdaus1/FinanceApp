import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  ChartFrame,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  ListRow,
  MoneyInput,
  OfflineBanner,
  PermissionState,
  Select,
  SensitiveValue,
  Sheet,
  Skeleton,
  ThemeProvider,
  Toast,
  useTheme,
} from '@financeapp/ui';

export const catalogComponentNames = [
  'Button',
  'Input',
  'MoneyInput',
  'Select',
  'Card',
  'ListRow',
  'Sheet',
  'Dialog',
  'Toast',
  'EmptyState',
  'Skeleton',
  'ErrorState',
  'PermissionState',
  'OfflineBanner',
  'SensitiveValue',
  'ChartFrame',
] as const;

export function ComponentCatalog(): React.JSX.Element {
  return (
    <ThemeProvider scheme="light" reducedMotion>
      <CatalogContent />
    </ThemeProvider>
  );
}

function CatalogContent(): React.JSX.Element {
  const { tokens } = useTheme();
  const [amount, setAmount] = useState<bigint | null>(125000n);
  const [account, setAccount] = useState<'cash' | 'bank'>('cash');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(true);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[tokens.typography.caption, styles.eyebrow, { color: tokens.colors.primary }]}>
        U00 / INTERNAL CATALOG
      </Text>
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        Warm pastel primitives
      </Text>
      <Text
        style={[tokens.typography.body, styles.description, { color: tokens.colors.textSecondary }]}
      >
        Fixture deterministik untuk review state, accessibility, privacy, dan responsif.
      </Text>

      <Section title="Actions and forms">
        <Button label="Simpan transaksi" onPress={() => setToastVisible(true)} />
        <Button label="Aksi sekunder" onPress={() => undefined} variant="secondary" />
        <Button label="Icon action" onPress={() => undefined} variant="icon">
          <Text>+</Text>
        </Button>
        <Input label="Catatan" value="Makan siang" onChangeText={() => undefined} hint="Opsional" />
        <MoneyInput label="Nominal" valueMinor={amount} onChangeMinor={setAmount} />
        <Select
          label="Rekening"
          value={account}
          options={[
            { label: 'Tunai', value: 'cash' },
            { label: 'Bank utama', value: 'bank' },
          ]}
          onChange={setAccount}
          searchable
        />
      </Section>

      <Section title="Surfaces and rows">
        <Card accessibilityLabel="Saldo utama" onPress={() => undefined}>
          <Text style={[tokens.typography.title, { color: tokens.colors.textPrimary }]}>
            Saldo utama
          </Text>
          <SensitiveValue value="Rp125.000" hidden />
        </Card>
        <ListRow
          title="Makan siang"
          subtitle="Manual / Hari ini"
          value="-Rp45.000"
          onPress={() => undefined}
          accessibilityLabel="Makan siang, minus empat puluh lima ribu rupiah"
        />
      </Section>

      <Section title="Feedback and states">
        <Skeleton height={24} />
        <EmptyState
          title="Belum ada aktivitas"
          message="Tambahkan transaksi pertama untuk melihat ringkasan."
          actionLabel="Tambah transaksi"
          onAction={() => undefined}
        />
        <ErrorState
          title="Tidak dapat memuat"
          message="Data lokal tetap aman. Coba lagi."
          onRetry={() => undefined}
        />
        <PermissionState
          title="Izinkan kamera"
          message="Kamera digunakan untuk membaca struk."
          actionLabel="Buka pengaturan"
          onAction={() => undefined}
          alternativeLabel="Catat manual"
          onAlternative={() => undefined}
          status="denied"
        />
        <OfflineBanner onRetry={() => undefined} />
        <SensitiveValue value="Rp125.000" hidden accessibilityLabel="Nominal disembunyikan" />
      </Section>

      <Section title="Modal feedback">
        <Button label="Buka sheet" onPress={() => setSheetVisible(true)} variant="secondary" />
        <Button label="Buka dialog" onPress={() => setDialogVisible(true)} variant="secondary" />
        <Sheet visible={sheetVisible} title="Pilih rekening" onClose={() => setSheetVisible(false)}>
          <Text>Sheet mendukung pilihan singkat dan safe-area.</Text>
        </Sheet>
        <Dialog
          visible={dialogVisible}
          title="Hapus transaksi?"
          message="Data dapat dipulihkan dari arsip."
          confirmLabel="Hapus"
          cancelLabel="Batal"
          onConfirm={() => setDialogVisible(false)}
          onCancel={() => setDialogVisible(false)}
          destructive
        />
        <Toast
          visible={toastVisible}
          message="Transaksi disimpan."
          actionLabel="Urungkan"
          onAction={() => setToastVisible(false)}
          onDismiss={() => setToastVisible(false)}
          duration={0}
        />
      </Section>

      <Section title="Chart and data alternative">
        <ChartFrame
          title="Arus kas Agustus"
          summary="Pengeluaran lebih tinggi dari Juli."
          dataTable={<Text>Alternatif data tabel tersedia.</Text>}
        >
          <View style={[styles.chartPlaceholder, { backgroundColor: tokens.colors.surfaceMuted }]}>
            <Text style={{ color: tokens.colors.textPrimary }}>Chart surface fixture</Text>
          </View>
        </ChartFrame>
        <ChartFrame
          title="Saldo tersembunyi"
          summary="Ringkasan privat"
          privacyHidden
          dataTable={<Text>Tidak ditampilkan saat privat.</Text>}
        >
          <Text style={{ color: tokens.colors.textPrimary }}>Private chart fixture</Text>
        </ChartFrame>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    padding: 20,
  },
  eyebrow: {
    letterSpacing: 1,
  },
  description: {},
  section: {
    gap: 12,
  },
  sectionContent: {
    gap: 12,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
});
