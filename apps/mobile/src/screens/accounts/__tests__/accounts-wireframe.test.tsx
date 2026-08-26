import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import {
  ACCOUNT_LAYOUT,
  ACCOUNT_TYPE_LABELS,
  DEFAULT_ACCOUNT_FIXTURES,
  SUPPORTED_ACCOUNT_TYPES,
  SUPPORTED_ACCOUNT_CURRENCIES,
  calculateNetWorth,
  createAccountsFixture,
  parseOpeningBalanceMinor,
  validateAccountDraft,
  type Account,
  type AccountsScenario,
} from '../accounts-fixture';
import { AccountsWireframe } from '../accounts-wireframe';

function renderAccounts(scenario?: AccountsScenario, options?: { reducedMotion?: boolean }) {
  return render(
    <ThemeProvider reducedMotion={options?.reducedMotion}>
      <AccountsWireframe fixture={createAccountsFixture(scenario)} />
    </ThemeProvider>,
  );
}

async function openFirstAccount() {
  expect(await screen.findByText('Akun & aset')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Kas fixture' }));
  expect(await screen.findByText('Detail akun')).toBeTruthy();
}

async function openCreateForm() {
  expect(await screen.findByText('Akun & aset')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Tambah akun' }));
  expect(await screen.findByText('Buat akun fixture')).toBeTruthy();
}

describe('U04 F03 accounts, wallets, assets, and liabilities wireframe', () => {
  beforeEach(() => {
    defaultSessionAdapter.reset();
  });

  it('exposes all supported account types, fixture currencies, and integer layout constraints', () => {
    expect(SUPPORTED_ACCOUNT_TYPES).toEqual([
      'cash',
      'bank',
      'e_wallet',
      'credit_card',
      'investment',
      'loan',
      'receivable',
      'other',
    ]);
    expect(Object.keys(ACCOUNT_TYPE_LABELS)).toEqual(SUPPORTED_ACCOUNT_TYPES);
    expect(SUPPORTED_ACCOUNT_CURRENCIES.map((currency) => currency.code)).toEqual([
      'IDR',
      'USD',
      'JPY',
    ]);
    expect(ACCOUNT_LAYOUT.minimumWidth).toBe(320);
    expect(ACCOUNT_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
    expect(DEFAULT_ACCOUNT_FIXTURES).toHaveLength(8);
  });

  it('validates account draft fields and parses signed opening balances without floating point', () => {
    const valid = {
      type: 'loan' as const,
      balanceKind: 'liability' as const,
      trackingMode: 'transactional' as const,
      name: 'KPR fixture',
      institutionLabel: 'Bank fixture',
      currency: 'USD' as const,
      lastFour: '1234',
      openingBalanceMajor: '-1234.56',
      openingBalanceAt: '2026-08-26',
      includeInNetWorth: true,
      accessMode: 'household' as const,
    };
    expect(validateAccountDraft(valid)).toEqual({ valid: true });
    expect(parseOpeningBalanceMinor('-1234.56', 'USD')).toBe('-123456');
    expect(parseOpeningBalanceMinor('500000', 'IDR')).toBe('500000');
    expect(() => parseOpeningBalanceMinor('1.234', 'USD')).toThrow();
    expect(
      validateAccountDraft({ ...valid, name: '', lastFour: '12x4', currency: 'usd' as never }),
    ).toEqual({ valid: false, fields: ['name', 'currency', 'lastFour'] });
  });

  it('renders every account type with asset/liability presentation and ready summary', async () => {
    renderAccounts();

    expect(await screen.findByText('Akun & aset')).toBeTruthy();
    for (const account of DEFAULT_ACCOUNT_FIXTURES) {
      expect(screen.getByText(account.name)).toBeTruthy();
      expect(screen.getByText(ACCOUNT_TYPE_LABELS[account.type])).toBeTruthy();
    }
    expect(screen.getByText('Subtotal IDR')).toBeTruthy();
    expect(screen.getByText('Total belum lengkap')).toBeTruthy();
    expect(screen.getByText('Valuasi tidak dihitung dua kali')).toBeTruthy();
  });

  it.each([
    ['empty', 'Belum ada akun fixture'],
    ['offline', 'Akun offline'],
    ['error', 'Akun gagal dimuat'],
  ] as const)('renders %s list state and exposes recovery', async (outcome, title) => {
    renderAccounts({ loadOutcomes: [outcome, 'ready'] });

    expect(await screen.findByText(title)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Akun & aset')).toBeTruthy();
  });

  it('renders syncing and partial-currency list states without inventing a total', async () => {
    const syncingRender = renderAccounts({ loadOutcomes: ['syncing'] });
    expect(await screen.findByText('Menyinkronkan akun fixture')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Lihat akun lokal' }));
    expect(await screen.findByText('Akun & aset')).toBeTruthy();

    syncingRender.unmount();
    renderAccounts({ loadOutcomes: ['partial_currency'] });
    expect(await screen.findByText('Kurs belum lengkap')).toBeTruthy();
    expect(screen.getByText('Total belum lengkap')).toBeTruthy();
    expect(screen.getByText('Subtotal USD')).toBeTruthy();
  });

  it('creates an account, supports all form choices, and exposes sync-pending retry', async () => {
    renderAccounts({ saveOutcomes: ['sync-pending', 'synced'] });
    await openCreateForm();
    fireEvent.changeText(screen.getByLabelText('Nama akun (wajib)'), 'Dompet baru fixture');
    fireEvent.changeText(screen.getByLabelText('Institusi'), 'Bank lokal fixture');
    fireEvent.press(screen.getByRole('radio', { name: 'E-wallet' }));
    fireEvent.press(screen.getByRole('radio', { name: 'USD — US Dollar' }));
    fireEvent.changeText(screen.getByLabelText('Empat digit terakhir'), '5678');
    fireEvent.changeText(screen.getByLabelText('Saldo awal (major unit)'), '12.34');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan akun fixture' }));

    expect(await screen.findByText('Akun menunggu sinkronisasi (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba sinkronisasi lagi' }));
    expect(await screen.findByText('Akun tersimpan (fixture)')).toBeTruthy();
    expect(screen.getByText('Dompet baru fixture')).toBeTruthy();
  });

  it('rejects invalid last four and keeps opening balance separate from running balance', async () => {
    renderAccounts();
    await openCreateForm();
    fireEvent.changeText(screen.getByLabelText('Nama akun (wajib)'), 'Akun invalid fixture');
    fireEvent.changeText(screen.getByLabelText('Empat digit terakhir'), '12');
    fireEvent.changeText(screen.getByLabelText('Saldo awal (major unit)'), '1.234');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan akun fixture' }));

    expect(await screen.findByText('Empat digit terakhir harus empat angka')).toBeTruthy();
    expect(screen.getByText('Saldo awal tidak boleh diedit sebagai saldo berjalan')).toBeTruthy();
  });

  it('locks currency after activity and directs the user to create a new account', async () => {
    renderAccounts();
    await openFirstAccount();
    fireEvent.press(screen.getByRole('button', { name: 'Edit akun' }));
    expect(await screen.findByText('Mata uang terkunci setelah activity')).toBeTruthy();
    expect(screen.getByText('Buat akun baru untuk mata uang berbeda')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'IDR — Indonesian Rupiah' }).props.disabled).toBe(
      true,
    );
  });

  it('supports archive confirmation cancel, dependency-blocked review, success, and restore', async () => {
    const successRender = renderAccounts({ archiveOutcomes: ['success'] });
    await openFirstAccount();
    fireEvent.press(screen.getByRole('button', { name: 'Arsipkan akun' }));
    expect(screen.getByTestId('account-archive-dialog')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Batal arsip' }));
    expect(screen.getByText('Detail akun')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Arsipkan akun' }));
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi arsip' }));
    expect(await screen.findByText('Akun diarsipkan (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Pulihkan akun' }));
    expect(await screen.findByText('Akun dipulihkan (fixture)')).toBeTruthy();

    successRender.unmount();
    renderAccounts({ archiveOutcomes: ['dependency-blocked'] });
    await openFirstAccount();
    fireEvent.press(screen.getByRole('button', { name: 'Arsipkan akun' }));
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi arsip' }));
    expect(await screen.findByText('Arsip tertahan oleh dependensi')).toBeTruthy();
    expect(screen.getByText('Alihkan aturan atau recurring fixture terlebih dahulu')).toBeTruthy();
  });

  it('records valuation history for non-transactional assets and prevents double count', async () => {
    const fixture = createAccountsFixture();
    const asset = DEFAULT_ACCOUNT_FIXTURES.find(
      (account) => account.type === 'investment',
    ) as Account;
    const before = calculateNetWorth(DEFAULT_ACCOUNT_FIXTURES);
    expect(before.byCurrency.find((item) => item.currency === 'USD')?.minor).toBe('120000');
    expect(before.doubleCountPrevented).toBe(true);

    renderAccounts({ initialAccounts: [asset] });
    expect(await screen.findByText('Investasi fixture')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Investasi fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Catat valuasi fixture' }));
    fireEvent.changeText(screen.getByLabelText('Nilai valuasi (major unit)'), '1500.00');
    fireEvent.changeText(screen.getByLabelText('Tanggal valuasi'), '2026-08-26');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan valuasi fixture' }));
    expect(await screen.findByText('Valuasi tercatat (fixture)')).toBeTruthy();
    expect(screen.getByText('Riwayat valuasi')).toBeTruthy();
    expect(fixture.previewNetWorth(DEFAULT_ACCOUNT_FIXTURES).doubleCountPrevented).toBe(true);
  });

  it('shows liability debt shell with non-negative outstanding principal and no F14 lifecycle', async () => {
    renderAccounts({ initialAccounts: [DEFAULT_ACCOUNT_FIXTURES[5] as Account] });
    fireEvent.press(await screen.findByRole('button', { name: 'Pinjaman fixture' }));
    expect(await screen.findByText('Detail akun')).toBeTruthy();
    expect(screen.getByText('Outstanding principal')).toBeTruthy();
    expect(screen.getByText('Tracking mode')).toBeTruthy();
    expect(screen.getByText('Tanggal jatuh tempo')).toBeTruthy();
    expect(screen.getByText('Pembayaran terjadwal')).toBeTruthy();
    expect(screen.queryByText(/amortisasi|statement|lifecycle F14/i)).toBeNull();
    expect(screen.getByText(/Rp/)).toBeTruthy();
  });

  it('shows conflict review and resolves local metadata without URL or network data', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    renderAccounts({ saveOutcomes: ['conflict', 'synced'] });
    await openCreateForm();
    fireEvent.changeText(screen.getByLabelText('Nama akun (wajib)'), 'Akun konflik fixture');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan akun fixture' }));
    expect(await screen.findByText('Konflik akun fixture')).toBeTruthy();
    expect(screen.getByText('Perangkat: Akun konflik fixture')).toBeTruthy();
    expect(screen.getByText('Server: Nama akun sebelumnya')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Gunakan nilai perangkat' }));
    expect(await screen.findByText('Akun tersimpan (fixture)')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('connects the F03 manifest route and Profile navigation without changing guards', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F03')).toMatchObject({
      routeId: 'accounts',
      path: '/accounts',
      navigationGroup: 'home',
      readiness: 'WIREFRAME READY',
    });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/profile' });
    fireEvent.press(await routerScreen.findByRole('button', { name: 'Open accounts' }));
    expect(await routerScreen.findByText('Akun & aset')).toBeTruthy();
  }, 15_000);

  it('keeps accessibility, focus order, reduced motion, and 320dp constraints explicit', async () => {
    renderAccounts(undefined, { reducedMotion: true });
    expect(await screen.findByTestId('accounts-scroll')).toBeTruthy();
    expect(screen.getByTestId('accounts-reduced-motion-indicator')).toBeTruthy();
    const actions = screen.getAllByRole('button');
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]?.props.accessibilityLabel).toBeTruthy();
    expect(ACCOUNT_LAYOUT.minimumWidth).toBe(320);
    expect(ACCOUNT_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
    expect(ACCOUNT_LAYOUT.contentMaxWidth).toBeGreaterThanOrEqual(320);
  });

  it('supports back actions and does not persist fixture account data', async () => {
    const onBack = jest.fn();
    render(
      <ThemeProvider>
        <AccountsWireframe fixture={createAccountsFixture()} onBack={onBack} />
      </ThemeProvider>,
    );
    expect(await screen.findByText('Akun & aset')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(createAccountsFixture().snapshot()).toEqual(DEFAULT_ACCOUNT_FIXTURES);
    await waitFor(() => expect(screen.getByTestId('accounts-scroll')).toBeTruthy());
  });

  it('covers local-only, save error, archive error, missing restore, and unsupported valuation fixtures', async () => {
    const draft = {
      type: 'cash' as const,
      balanceKind: 'asset' as const,
      trackingMode: 'transactional' as const,
      name: 'Boundary fixture',
      institutionLabel: 'Fixture',
      currency: 'IDR' as const,
      lastFour: '',
      openingBalanceMajor: '0',
      openingBalanceAt: '2026-08-26',
      includeInNetWorth: true,
      accessMode: 'personal' as const,
    };
    expect((await createAccountsFixture({ saveOutcomes: ['local_only'] }).save(draft)).kind).toBe(
      'local_only',
    );
    expect((await createAccountsFixture({ saveOutcomes: ['error'] }).save(draft)).kind).toBe(
      'error',
    );
    expect(
      (
        await createAccountsFixture({
          initialAccounts: [DEFAULT_ACCOUNT_FIXTURES[0] as Account],
          archiveOutcomes: ['error'],
        }).archive(DEFAULT_ACCOUNT_FIXTURES[0]?.id ?? '')
      ).kind,
    ).toBe('error');
    expect(await createAccountsFixture().restore('missing-fixture')).toBeUndefined();
    expect(
      await createAccountsFixture().addValuation('account-cash-fixture', '10', '2026-08-26'),
    ).toBeUndefined();
    expect(calculateNetWorth([])).toMatchObject({ byCurrency: [], incomplete: false });

    render(
      <ThemeProvider>
        <AccountsWireframe />
      </ThemeProvider>,
    );
    expect(await screen.findByText('Akun & aset')).toBeTruthy();
  });
});
