import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import type { ReactElement } from 'react';

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
  useReducedMotion,
  useTheme,
} from '@financeapp/ui';

function renderWithTheme(element: ReactElement, reducedMotion = false): void {
  render(
    <ThemeProvider scheme="light" reducedMotion={reducedMotion}>
      {element}
    </ThemeProvider>,
  );
}

function MotionProbe(): React.JSX.Element {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <Text>
      {theme.scheme}:{reducedMotion ? 'reduced' : 'motion'}:{theme.tokens.colors.canvas}
    </Text>
  );
}

describe('U00 component contracts', () => {
  it('exposes the light/dark semantic theme and reduced-motion override', () => {
    renderWithTheme(<MotionProbe />, true);
    expect(screen.getByText('light:reduced:#FFF9F0')).toBeTruthy();
  });

  it('renders accessible form controls and emits typed amount values', () => {
    const onAmountChange = jest.fn();
    const onSelect = jest.fn();

    renderWithTheme(
      <>
        <Button label="Simpan transaksi" onPress={jest.fn()} />
        <Input label="Catatan" value="Makan siang" onChangeText={jest.fn()} />
        <MoneyInput
          label="Nominal"
          currency="IDR"
          valueMinor={125000n}
          onChangeMinor={onAmountChange}
        />
        <Select
          label="Rekening"
          value="cash"
          options={[{ label: 'Tunai', value: 'cash' }]}
          onChange={onSelect}
        />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Simpan transaksi' })).toBeTruthy();
    expect(screen.getByLabelText('Catatan')).toBeTruthy();
    expect(screen.getByLabelText('Nominal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rekening' })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Nominal'), 'Rp 126.000');
    expect(onAmountChange).toHaveBeenCalledWith(126000n);

    fireEvent.press(screen.getByRole('button', { name: 'Rekening' }));
    const tunaiButtons = screen.getAllByRole('button', { name: 'Tunai' });
    fireEvent.press(tunaiButtons[tunaiButtons.length - 1]!);
    expect(onSelect).toHaveBeenCalledWith('cash');
  });

  it('keeps controls readable in disabled, loading, and error states', () => {
    renderWithTheme(
      <>
        <Button label="Simpan" loading onPress={jest.fn()} />
        <Button label="Hapus" disabled onPress={jest.fn()} />
        <Input label="Wajib diisi" value="" onChangeText={jest.fn()} error="Isi nominalnya." />
        <Skeleton testID="loading-skeleton" />
      </>,
    );

    const loadingButton = screen.getByRole('button', { name: 'Simpan' });
    expect(loadingButton.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(screen.getByRole('button', { name: 'Hapus' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(screen.getByText('Isi nominalnya.')).toBeTruthy();
    expect(screen.getByTestId('loading-skeleton').props.accessibilityState).toMatchObject({
      busy: true,
    });
  });

  it('redacts sensitive values from visible and accessibility output', () => {
    renderWithTheme(
      <SensitiveValue
        value="Rp125.000"
        hidden
        accessibilityLabel="Nominal disembunyikan"
      />,
    );

    expect(screen.getByText('••••')).toBeTruthy();
    expect(screen.queryByText('Rp125.000')).toBeNull();
    expect(screen.getByLabelText('Nominal disembunyikan')).toBeTruthy();
  });

  it('provides card and row semantics without shrinking the transaction target', () => {
    renderWithTheme(
      <>
        <Card accessibilityLabel="Saldo utama" onPress={jest.fn()}>
          <Text>Saldo</Text>
        </Card>
        <ListRow
          title="Makan siang"
          subtitle="Hari ini"
          value="-Rp45.000"
          accessibilityLabel="Makan siang, minus empat puluh lima ribu rupiah"
          onPress={jest.fn()}
        />
      </>,
    );

    const card = screen.getByRole('button', { name: 'Saldo utama' });
    const row = screen.getByRole('button', {
      name: 'Makan siang, minus empat puluh lima ribu rupiah',
    });
    expect(card).toBeTruthy();
    expect(row).toBeTruthy();
    expect(StyleSheet.flatten(row.props.style).minHeight).toBeGreaterThanOrEqual(48);
  });

  it('supports modal, decision, toast, and offline feedback states', () => {
    const onSheetClose = jest.fn();
    const onDialogConfirm = jest.fn();
    const onToastDismiss = jest.fn();

    renderWithTheme(
      <>
        <Sheet visible title="Pilih rekening" onClose={onSheetClose}>
          <Text>Daftar rekening</Text>
        </Sheet>
        <Dialog
          visible
          title="Hapus transaksi?"
          message="Data dapat dipulihkan dari arsip."
          confirmLabel="Hapus"
          cancelLabel="Batal"
          onConfirm={onDialogConfirm}
          onCancel={jest.fn()}
        />
        <Toast
          visible
          message="Transaksi disimpan."
          actionLabel="Urungkan"
          onAction={jest.fn()}
          onDismiss={onToastDismiss}
          duration={0}
        />
        <OfflineBanner />
      </>,
    );

    expect(screen.getByText('Pilih rekening')).toBeTruthy();
    expect(screen.getByText('Hapus transaksi?')).toBeTruthy();
    expect(screen.getByText('Transaksi disimpan.')).toBeTruthy();
    expect(screen.getByText('Offline—perubahan disimpan di perangkat.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Tutup' }));
    expect(onSheetClose).toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Hapus' }));
    expect(onDialogConfirm).toHaveBeenCalled();
  });

  it('renders empty, permission, error, and chart alternatives', () => {
    renderWithTheme(
      <>
        <EmptyState
          title="Belum ada aktivitas"
          message="Tambahkan transaksi pertama untuk melihat ringkasan."
          actionLabel="Tambah transaksi"
          onAction={jest.fn()}
        />
        <ErrorState
          title="Tidak dapat memuat"
          message="Data lokal tetap aman. Coba lagi."
          retryLabel="Coba lagi"
          onRetry={jest.fn()}
        />
        <PermissionState
          title="Izinkan kamera"
          message="Kamera digunakan untuk membaca struk."
          actionLabel="Buka pengaturan"
          onAction={jest.fn()}
          alternativeLabel="Catat manual"
          onAlternative={jest.fn()}
        />
        <ChartFrame
          title="Arus kas Agustus"
          summary="Pengeluaran lebih tinggi dari Juli."
          dataTable={<Text>Data tabel arus kas</Text>}
        >
          <Text>Chart fixture</Text>
        </ChartFrame>
      </>,
    );

    expect(screen.getByText('Belum ada aktivitas')).toBeTruthy();
    expect(screen.getByText('Tidak dapat memuat')).toBeTruthy();
    expect(screen.getByText('Izinkan kamera')).toBeTruthy();
    expect(screen.getByText('Data tabel arus kas')).toBeTruthy();
    expect(screen.getByText('Pengeluaran lebih tinggi dari Juli.')).toBeTruthy();
  });
});
