import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { AuthBootstrapWireframe } from '../../auth/auth-bootstrap-wireframe';
import {
  DEFAULT_FINANCIAL_PREFERENCES,
  FINANCIAL_PROFILE_LAYOUT,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  SUPPORTED_TIMEZONES,
  createFinancialProfileFixture,
  resolveLocaleForRender,
  resolveTimezoneForRender,
  validateFinancialPreferences,
  type FinancialProfileScenario,
  type FinancialPreferences,
} from '../financial-profile-fixture';
import { FinancialProfileWireframe } from '../financial-profile-wireframe';

function renderFinancialProfile(
  scenario?: FinancialProfileScenario,
  options?: { onBack?: () => void; reducedMotion?: boolean },
) {
  return render(
    <ThemeProvider reducedMotion={options?.reducedMotion}>
      <FinancialProfileWireframe
        fixture={createFinancialProfileFixture(scenario)}
        onBack={options?.onBack}
      />
    </ThemeProvider>,
  );
}

async function goToCurrencyStep() {
  expect(await screen.findByText('Lokasi & waktu')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Lanjut ke mata uang' }));
  expect(await screen.findByText('Mata uang & periode')).toBeTruthy();
}

async function goToPrivacyStep() {
  await goToCurrencyStep();
  fireEvent.press(screen.getByRole('button', { name: 'Lanjut ke privasi' }));
  expect(await screen.findByText('Privasi & preferensi')).toBeTruthy();
}

async function saveDefaultProfile() {
  await goToPrivacyStep();
  fireEvent.press(screen.getByRole('button', { name: 'Simpan preferensi fixture' }));
}

describe('U03 F02 financial profile and preferences wireframe', () => {
  beforeEach(() => {
    defaultSessionAdapter.reset();
  });

  it('exposes typed fixture catalogs and editable Indonesia defaults', () => {
    expect(DEFAULT_FINANCIAL_PREFERENCES).toMatchObject({
      locale: 'id-ID',
      timezone: 'Asia/Jakarta',
      baseCurrency: 'IDR',
      dateFormat: 'DD/MM/YYYY',
      weekStartsOn: 1,
      financialMonthStart: 1,
    });
    expect(SUPPORTED_LOCALES.map((item) => item.code)).toEqual(
      expect.arrayContaining(['id-ID', 'en-US', 'ar-EG']),
    );
    expect(SUPPORTED_TIMEZONES).toEqual(
      expect.arrayContaining(['Asia/Jakarta', 'Asia/Singapore', 'UTC']),
    );
    expect(SUPPORTED_CURRENCIES.map((item) => item.code)).toEqual(['IDR', 'USD', 'JPY']);
    expect(validateFinancialPreferences(DEFAULT_FINANCIAL_PREFERENCES)).toEqual({ valid: true });
  });

  it('validates locale, timezone, ISO currency, week start, and financial month bounds', () => {
    const invalid = {
      ...DEFAULT_FINANCIAL_PREFERENCES,
      locale: 'fr-FR',
      timezone: 'Mars/Olympus',
      baseCurrency: 'usd',
      weekStartsOn: 2,
      financialMonthStart: 29,
    } as FinancialPreferences;

    expect(validateFinancialPreferences(invalid)).toEqual({
      valid: false,
      fields: ['locale', 'timezone', 'baseCurrency', 'weekStartsOn', 'financialMonthStart'],
    });
    expect(resolveLocaleForRender('fr-FR')).toEqual({ value: 'id-ID', fallback: true });
    expect(resolveTimezoneForRender('Mars/Olympus')).toEqual({ value: null, fallback: false });
    expect(resolveTimezoneForRender('Asia/Jakarta')).toEqual({
      value: 'Asia/Jakarta',
      fallback: false,
    });
  });

  it('renders default loading/editing states and keeps location choices editable', async () => {
    renderFinancialProfile();

    expect(await screen.findByText('Lokasi & waktu')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Indonesia (id-ID)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'English (en-US)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Asia/Jakarta' })).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'English (en-US)' }));
    expect(screen.getByText('Locale aktif: en-US')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Asia/Singapore' }));
    expect(screen.getByText('Zona waktu aktif: Asia/Singapore')).toBeTruthy();
  });

  it('requires explicit confirmation before changing base currency', async () => {
    renderFinancialProfile();
    await goToCurrencyStep();

    fireEvent.press(screen.getByRole('radio', { name: 'USD — US Dollar' }));
    expect(await screen.findByTestId('currency-confirmation-dialog')).toBeTruthy();
    expect(screen.getByText(/Transaksi historis tidak dikonversi permanen/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Batal ganti mata uang' }));
    expect(screen.getByText('Mata uang dasar: IDR')).toBeTruthy();

    fireEvent.press(screen.getByRole('radio', { name: 'USD — US Dollar' }));
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi ganti mata uang' }));
    expect(screen.getByText('Mata uang dasar: USD')).toBeTruthy();
    expect(screen.getByText(/Histori tetap menggunakan currency dan amount lama/)).toBeTruthy();
  });

  it('shows validation error for an invalid financial month and recovers after editing', async () => {
    renderFinancialProfile();
    await goToCurrencyStep();
    fireEvent.changeText(screen.getByLabelText('Awal bulan finansial (wajib)'), '29');
    fireEvent.press(screen.getByRole('button', { name: 'Lanjut ke privasi' }));
    expect(await screen.findByText('Privasi & preferensi')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Simpan preferensi fixture' }));
    expect(await screen.findByText('Awal bulan finansial harus 1–28')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Awal bulan finansial (wajib)'), '28');
    fireEvent.press(screen.getByRole('button', { name: 'Lanjut ke privasi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan preferensi fixture' }));
    expect(await screen.findByText('Preferensi tersinkron (fixture)')).toBeTruthy();
  });

  it('allows privacy and analytics preferences to be toggled and edited again', async () => {
    renderFinancialProfile();
    await goToPrivacyStep();

    const analytics = screen.getByRole('switch', { name: 'Analytics anonim fixture' });
    const maskAmounts = screen.getByRole('switch', { name: 'Sembunyikan nominal lokal' });
    expect(analytics.props.accessibilityState.checked).toBe(true);
    expect(maskAmounts.props.accessibilityState.checked).toBe(false);
    fireEvent.press(analytics);
    fireEvent.press(maskAmounts);
    expect(
      screen.getByRole('switch', { name: 'Analytics anonim fixture' }).props.accessibilityState
        .checked,
    ).toBe(false);
    expect(
      screen.getByRole('switch', { name: 'Sembunyikan nominal lokal' }).props.accessibilityState
        .checked,
    ).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Simpan preferensi fixture' }));
    expect(await screen.findByText('Preferensi tersinkron (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Edit preferensi lagi' }));
    expect(
      screen.getByRole('switch', { name: 'Analytics anonim fixture' }).props.accessibilityState
        .checked,
    ).toBe(false);
  });

  it('models offline save as sync pending and recovers with retry', async () => {
    renderFinancialProfile({ saveOutcomes: ['sync-pending', 'synced'] });
    await saveDefaultProfile();

    expect(await screen.findByText('Menunggu sinkronisasi (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba sinkronisasi lagi' }));
    expect(await screen.findByText('Preferensi tersinkron (fixture)')).toBeTruthy();
  });

  it('shows offline loading recovery without overwriting unknown timezone values', async () => {
    renderFinancialProfile({
      loadOutcomes: ['offline', 'loaded'],
      initialPreferences: { timezone: 'Mars/Olympus' },
    });
    expect(await screen.findByText('Profil keuangan offline')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Lokasi & waktu')).toBeTruthy();
    expect(screen.getByText('Zona tersimpan tidak dikenali: Mars/Olympus')).toBeTruthy();
  });

  it('shows conflict values and keeps an explicit per-field recovery action', async () => {
    renderFinancialProfile({ saveOutcomes: ['conflict'] });
    await saveDefaultProfile();

    expect(await screen.findByText('Konflik preferensi fixture')).toBeTruthy();
    expect(screen.getByText('Perangkat: USD')).toBeTruthy();
    expect(screen.getByText('Server: IDR')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Gunakan nilai perangkat' }));
    expect(await screen.findByText('Preferensi tersinkron (fixture)')).toBeTruthy();
  });

  it('retries a fixture save error without persistence or production network', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const fixture = createFinancialProfileFixture({ saveOutcomes: ['error', 'synced'] });
    await fixture.load();
    render(
      <ThemeProvider>
        <FinancialProfileWireframe fixture={fixture} />
      </ThemeProvider>,
    );
    await goToPrivacyStep();
    fireEvent.press(screen.getByRole('button', { name: 'Simpan preferensi fixture' }));
    expect(await screen.findByText('Penyimpanan fixture gagal')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Preferensi tersinkron (fixture)')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('connects F02 to the U01 manifest and Profile route with WIREFRAME READY status', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F02')).toMatchObject({
      routeId: 'financial-preferences',
      path: '/profile/preferences',
      navigationGroup: 'profile',
      readiness: 'WIREFRAME READY',
    });

    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/profile' });
    expect(
      await routerScreen.findByRole('button', { name: 'Open financial profile' }),
    ).toBeTruthy();
    fireEvent.press(routerScreen.getByRole('button', { name: 'Open financial profile' }));
    expect(await routerScreen.findByText('Lokasi & waktu')).toBeTruthy();
  }, 15_000);

  it('provides the U02 completion callback into the financial profile flow', async () => {
    const onFinancialProfile = jest.fn();
    render(
      <ThemeProvider>
        <AuthBootstrapWireframe onFinancialProfile={onFinancialProfile} />
      </ThemeProvider>,
    );
    fireEvent.press(await screen.findByRole('button', { name: 'Lanjutkan dengan Google' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Validasi callback fixture' }));
    fireEvent.changeText(await screen.findByLabelText('Nama tampilan (wajib)'), 'Fixture User');
    fireEvent.press(screen.getByRole('checkbox', { name: 'Syarat Layanan fixture' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Kebijakan Privasi fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan akun fixture' }));
    expect(await screen.findByText('Wireframe akun selesai')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Buka profil keuangan fixture' }));
    expect(onFinancialProfile).toHaveBeenCalledTimes(1);
  });

  it('provides Profile back navigation from the financial profile flow', async () => {
    const onBack = jest.fn();
    renderFinancialProfile(undefined, { onBack });
    expect(await screen.findByText('Lokasi & waktu')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke profil' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps accessibility, reduced-motion, and 320dp layout constraints explicit', async () => {
    renderFinancialProfile(undefined, { reducedMotion: true });
    expect(await screen.findByText('Lokasi & waktu')).toBeTruthy();
    expect(screen.getByTestId('financial-profile-scroll')).toBeTruthy();
    expect(screen.getByTestId('financial-profile-reduced-motion-indicator')).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'Indonesia (id-ID)' }).props.accessibilityState.checked,
    ).toBe(true);
    expect(FINANCIAL_PROFILE_LAYOUT.minimumWidth).toBe(320);
    expect(FINANCIAL_PROFILE_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
    expect(FINANCIAL_PROFILE_LAYOUT.contentMaxWidth).toBeGreaterThanOrEqual(320);
  });

  it('formats an integer fixture amount with locale-aware APIs without floating point values', async () => {
    const fixture = createFinancialProfileFixture();
    const preview = fixture.preview(DEFAULT_FINANCIAL_PREFERENCES);
    expect(preview.amount).toContain('Rp');
    expect(preview.date).toBeTruthy();
    await waitFor(() => expect(preview.amount).not.toContain('NaN'));
  });
});
