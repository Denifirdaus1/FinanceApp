import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, ScrollView, StyleSheet, Text } from 'react-native';
import type { ReactElement } from 'react';

import {
  Button,
  Card,
  ChartFrame,
  darkTheme,
  Dialog,
  EmptyState,
  ErrorState,
  formatAmountInput,
  formatEditableMoneyInput,
  formatMoney,
  Input,
  interaction,
  lightTheme,
  ListRow,
  MoneyInput,
  OfflineBanner,
  PermissionState,
  parseMoneyInput,
  ResourceState,
  Select,
  SensitiveValue,
  Sheet,
  Skeleton,
  ThemeProvider,
  Toast,
  typography,
  useReducedMotion,
  useTheme,
} from '@financeapp/ui';

import { ComponentCatalog, catalogComponentNames } from './catalog';

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
  it('mounts the complete deterministic catalog without a production route', () => {
    render(<ComponentCatalog scheme="dark" reducedMotion />);

    expect(catalogComponentNames).toHaveLength(16);
    expect(screen.getByText('Warm pastel primitives')).toBeTruthy();
  });

  it('keeps light/dark semantic values, tabular money, motion, and touch metrics stable', () => {
    expect(lightTheme.colors.canvas).not.toBe(darkTheme.colors.canvas);
    expect(lightTheme.colors.chart.plum).not.toBe(darkTheme.colors.chart.plum);
    expect(lightTheme.typography.amountRow.fontVariant).toContain('tabular-nums');
    expect(lightTheme.motion.fast.duration).toBe(180);
    expect(lightTheme.motion.slow.duration).toBe(360);
    expect(interaction.minimumTouchTarget).toBe(48);
    expect(lightTheme.componentMetrics.rowMinHeight).toBe(68);
    expect(typography.body.fontFamily).toBe('PlusJakartaSans_400Regular');
    expect(typography.bodyLarge.fontFamily).toBe('PlusJakartaSans_500Medium');
    expect(typography.heading3.fontFamily).toBe('PlusJakartaSans_600SemiBold');
    expect(typography.heading1.fontFamily).toBe('PlusJakartaSans_700Bold');
  });

  it('formats and parses IDR and fractional currencies without floating point values', () => {
    expect(formatAmountInput(125000n)).toBe('125.000');
    expect(formatEditableMoneyInput('1', 'en-US')).toBe('1');
    expect(formatMoney(125000n)).toBe('Rp125.000');
    expect(formatMoney(-125000n)).toBe('-Rp125.000');
    expect(formatMoney(125000n, 'IDR', 'id-ID', true)).toBe('+Rp125.000');
    expect(parseMoneyInput('Rp 125.000')).toBe(125000n);
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('-Rp 125.000')).toBeNull();
    expect(parseMoneyInput('-Rp 125.000', 'IDR', 'id-ID', true)).toBe(-125000n);
    expect(parseMoneyInput('1,25', 'USD', 'id-ID')).toBe(125n);
    expect(formatMoney(125n, 'USD', 'en-US')).toBe('$1.25');
    expect(formatMoney(125n, 'EUR', 'de-DE')).toBe(`1,25${String.fromCharCode(160)}€`);
    expect(parseMoneyInput('1,234', 'KWD', 'en-US', false, 3)).toBe(1234000n);
    expect(parseMoneyInput('1.234', 'KWD', 'en-US', false, 3)).toBe(1234n);
    const arabicAmount = formatAmountInput(123400n, 'USD', 'ar-EG');
    expect(arabicAmount).toContain('١');
    expect(parseMoneyInput(arabicAmount, 'USD', 'ar-EG')).toBe(123400n);
    expect(parseMoneyInput('--1', 'USD', 'en-US', true)).toBeNull();
    expect(parseMoneyInput('1.2.3', 'USD', 'en-US')).toBeNull();
    expect(parseMoneyInput('1,2,3', 'USD', 'en-US')).toBeNull();
    expect(parseMoneyInput('1,2345', 'USD', 'en-US')).toBeNull();
  });

  it('exposes the light/dark semantic theme and reduced-motion override', () => {
    renderWithTheme(<MotionProbe />, true);
    expect(screen.getByText(`light:reduced:${lightTheme.colors.canvas}`)).toBeTruthy();
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
    expect(StyleSheet.flatten(screen.getByLabelText('Nominal').props.style).fontVariant).toContain(
      'tabular-nums',
    );
    expect(screen.getByRole('button', { name: 'Rekening' })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Nominal'), 'Rp 126.000');
    expect(onAmountChange).toHaveBeenCalledWith(126000n);

    fireEvent.press(screen.getByRole('button', { name: 'Rekening' }));
    const tunaiButtons = screen.getAllByRole('button', { name: 'Tunai' });
    fireEvent.press(tunaiButtons[tunaiButtons.length - 1]!);
    expect(onSelect).toHaveBeenCalledWith('cash');
  });

  it('shows a visible focus ring on select options', () => {
    renderWithTheme(
      <Select
        label="Rekening"
        value="cash"
        options={[{ label: 'Tunai', value: 'cash' }]}
        onChange={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Rekening' }));
    const options = screen.getAllByRole('button', { name: 'Tunai' });
    const option = options[options.length - 1]!;
    fireEvent(option, 'focus');

    expect(StyleSheet.flatten(option.props.style).borderColor).toBe(lightTheme.colors.info);
    expect(StyleSheet.flatten(option.props.style).borderWidth).toBe(lightTheme.stroke.focus);
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
    const buttonStyle = loadingButton.props.style;
    const loadingButtonStyle =
      typeof buttonStyle === 'function' ? buttonStyle({ pressed: false }) : buttonStyle;
    expect(StyleSheet.flatten(loadingButtonStyle).minHeight).toBeGreaterThanOrEqual(
      interaction.minimumTouchTarget,
    );
    expect(screen.getByRole('button', { name: 'Hapus' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(StyleSheet.flatten(screen.getByText('Hapus').props.style).color).toBe(
      lightTheme.colors.disabled.text,
    );
    expect(screen.getByText('Isi nominalnya.')).toBeTruthy();
    expect(screen.getByTestId('loading-skeleton').props.accessibilityState).toMatchObject({
      busy: true,
    });
  });

  it('shows an information-colored focus ring for keyboard and assistive focus', () => {
    renderWithTheme(<Button label="Fokus" onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Fokus' });

    fireEvent(button, 'focus');

    expect(StyleSheet.flatten(button.props.style).borderColor).toBe(lightTheme.colors.info);
    expect(StyleSheet.flatten(button.props.style).borderWidth).toBe(lightTheme.stroke.focus);
  });

  it('redacts sensitive values from visible and accessibility output', () => {
    renderWithTheme(
      <SensitiveValue value="Rp125.000" hidden accessibilityLabel="Nominal disembunyikan" />,
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
    expect(StyleSheet.flatten(card.props.style).minWidth).toBeGreaterThanOrEqual(48);
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

  it('keeps fractional money drafts editable and selects a decimal keyboard', () => {
    const onChangeMinor = jest.fn();
    renderWithTheme(
      <MoneyInput
        label="Nominal pecahan"
        currency="USD"
        locale="en-US"
        valueMinor={null}
        onChangeMinor={onChangeMinor}
      />,
    );

    const input = screen.getByLabelText('Nominal pecahan');
    expect(input.props.keyboardType).toBe('decimal-pad');
    fireEvent(input, 'focus');
    fireEvent.changeText(input, '1');
    expect(screen.getByLabelText('Nominal pecahan').props.value).toBe('1');
    fireEvent.changeText(input, '1.');

    expect(screen.getByLabelText('Nominal pecahan').props.value).toBe('1.');
    expect(onChangeMinor).toHaveBeenCalledWith(100n);
  });

  it('accepts an external controlled amount reset while the field is focused', () => {
    const onChangeMinor = jest.fn();
    const { rerender } = render(
      <ThemeProvider scheme="light" reducedMotion>
        <MoneyInput
          label="Nominal reset"
          currency="USD"
          locale="en-US"
          valueMinor={null}
          onChangeMinor={onChangeMinor}
        />
      </ThemeProvider>,
    );
    const input = screen.getByLabelText('Nominal reset');
    fireEvent(input, 'focus');
    fireEvent.changeText(input, '1.2');

    rerender(
      <ThemeProvider scheme="light" reducedMotion>
        <MoneyInput
          label="Nominal reset"
          currency="USD"
          locale="en-US"
          valueMinor={500n}
          onChangeMinor={onChangeMinor}
        />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText('Nominal reset').props.value).toBe('5.00');
  });

  it('reformats a focused money draft when its currency format changes externally', () => {
    const onChangeMinor = jest.fn();
    const { rerender } = render(
      <ThemeProvider scheme="light" reducedMotion>
        <MoneyInput
          label="Nominal lokal"
          currency="USD"
          locale="en-US"
          valueMinor={125n}
          onChangeMinor={onChangeMinor}
        />
      </ThemeProvider>,
    );
    fireEvent(screen.getByLabelText('Nominal lokal'), 'focus');

    rerender(
      <ThemeProvider scheme="light" reducedMotion>
        <MoneyInput
          label="Nominal lokal"
          currency="EUR"
          locale="de-DE"
          valueMinor={125n}
          onChangeMinor={onChangeMinor}
        />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText('Nominal lokal').props.value).toBe('1,25');
  });

  it('keeps dialog content scrollable for long copy while actions remain available', () => {
    renderWithTheme(
      <Dialog
        visible
        title="Konfirmasi"
        message={'Penjelasan '.repeat(80)}
        confirmLabel="Lanjutkan"
        cancelLabel="Batal"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.UNSAFE_getAllByType(ScrollView).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Lanjutkan' })).toBeTruthy();
  });

  it('disables sheet animation when reduced motion is enabled', () => {
    renderWithTheme(
      <Sheet visible title="Pilihan" onClose={jest.fn()}>
        <Text>Isi sheet</Text>
      </Sheet>,
      true,
    );

    expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe('none');
  });

  it('dismisses a toast using the five-second semantic duration', () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    renderWithTheme(<Toast visible message="Selesai" onDismiss={onDismiss} />);

    jest.advanceTimersByTime(lightTheme.componentMetrics.toastDuration);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
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

  it('does not expose chart data table content while privacy mode is active', () => {
    renderWithTheme(
      <ChartFrame
        title="Saldo"
        summary="Saldo periode berjalan."
        privacyHidden
        dataTable={<Text>Nominal tabel rahasia</Text>}
      >
        <Text>Chart rahasia</Text>
      </ChartFrame>,
    );

    expect(screen.getAllByText('Nominal disembunyikan.').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Nominal tabel rahasia')).toBeNull();
    expect(screen.queryByText('Chart rahasia')).toBeNull();
  });

  it('composes deterministic loading, empty, offline, and error resource states', () => {
    renderWithTheme(
      <ResourceState status="offline">
        <Text>Ready</Text>
      </ResourceState>,
    );
    expect(screen.getByText('Offline—perubahan disimpan di perangkat.')).toBeTruthy();
    expect(screen.queryByText('Ready')).toBeNull();
  });

  it('renders every resource-state branch without leaking ready content', () => {
    renderWithTheme(
      <>
        <ResourceState status="loading">
          <Text>Ready loading</Text>
        </ResourceState>
        <ResourceState status="loading" loading={<Text>Loading custom</Text>}>
          <Text>Ready custom loading</Text>
        </ResourceState>
        <ResourceState status="empty" empty={<Text>Empty custom</Text>}>
          <Text>Ready empty</Text>
        </ResourceState>
        <ResourceState status="offline" offline={<Text>Offline custom</Text>}>
          <Text>Ready offline</Text>
        </ResourceState>
        <ResourceState status="error" error={<Text>Error custom</Text>}>
          <Text>Ready error</Text>
        </ResourceState>
        <ResourceState status="ready">
          <Text>Ready content</Text>
        </ResourceState>
      </>,
    );

    expect(screen.getByLabelText('Memuat')).toBeTruthy();
    expect(screen.getByText('Loading custom')).toBeTruthy();
    expect(screen.getByText('Empty custom')).toBeTruthy();
    expect(screen.getByText('Offline custom')).toBeTruthy();
    expect(screen.getByText('Error custom')).toBeTruthy();
    expect(screen.getByText('Ready content')).toBeTruthy();
    expect(screen.queryByText('Ready loading')).toBeNull();
  });

  it('keeps passive and optional primitive variants usable at narrow widths', () => {
    const onSecondary = jest.fn();
    renderWithTheme(
      <>
        <Card testID="passive-card">
          <Text>Passive card</Text>
        </Card>
        <ListRow title="Static row" />
        <SensitiveValue value="Rp25.000" hidden={false} />
        <Select
          label="Disabled account"
          value={null}
          options={[{ label: 'Tunai', value: 'cash' }]}
          onChange={jest.fn()}
          error="Pilih rekening."
          disabled
        />
        <Dialog
          visible={false}
          title="Hidden dialog"
          message="Hidden"
          confirmLabel="OK"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
        <Sheet visible={false} title="Hidden sheet" onClose={jest.fn()}>
          <Text>Hidden sheet content</Text>
        </Sheet>
        <Toast visible={false} message="Hidden toast" onDismiss={jest.fn()} />
        <EmptyState
          title="Optional action"
          message="Secondary action remains available."
          actionLabel="Primary"
          onAction={jest.fn()}
          secondaryLabel="Secondary"
          onSecondary={onSecondary}
        />
        <ErrorState title="Passive error" message="No retry is available." />
        <PermissionState
          title="Prompt permission"
          message="Permission has not been requested."
          actionLabel="Continue"
          onAction={jest.fn()}
        />
        <ChartFrame title="Loading chart" summary="Loading" loading>
          <Text>Hidden loading chart</Text>
        </ChartFrame>
        <ChartFrame title="Empty chart" summary="No data" emptyMessage="No chart data">
          <Text>Hidden empty chart</Text>
        </ChartFrame>
      </>,
    );

    expect(screen.getByTestId('passive-card').props.accessibilityRole).toBeUndefined();
    expect(screen.getByText('Static row')).toBeTruthy();
    expect(screen.getByLabelText('Rp25.000')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Disabled account' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(screen.getByRole('button', { name: 'Secondary' }));
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Hidden dialog')).toBeNull();
    expect(screen.queryByText('Hidden sheet content')).toBeNull();
    expect(screen.queryByText('Hidden toast')).toBeNull();
    expect(screen.queryByText('Hidden loading chart')).toBeNull();
    expect(screen.queryByText('Hidden empty chart')).toBeNull();
  });
});
