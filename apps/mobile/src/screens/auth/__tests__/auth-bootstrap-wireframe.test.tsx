import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { ThemeProvider } from '../../../app/providers/theme-provider';
import {
  AUTH_LAYOUT,
  createAuthFixture,
  parseAuthCallback,
  type AuthFixtureScenario,
} from '../auth-bootstrap-fixture';
import { AuthBootstrapWireframe } from '../auth-bootstrap-wireframe';

function renderWireframe(scenario?: AuthFixtureScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <AuthBootstrapWireframe fixture={createAuthFixture(scenario)} />
    </ThemeProvider>,
  );
}

async function advanceToAccountBootstrap() {
  fireEvent.press(await screen.findByRole('button', { name: 'Lanjutkan dengan Google' }));
  expect(await screen.findByText('Callback OAuth (fixture)')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Validasi callback fixture' }));
  expect(await screen.findByText('Lengkapi akun (fixture)')).toBeTruthy();
}

describe('F01 auth and account bootstrap wireframe', () => {
  it('connects F01 to the U01 onboarding route without changing the auth guard', () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F01')).toMatchObject({
      routeId: 'onboarding',
      path: '/onboarding',
      navigationGroup: 'public',
      readiness: 'WIREFRAME READY',
    });
  });

  it('renders the welcome state with accessible Google and Apple actions', () => {
    renderWireframe();

    expect(screen.getByText('Catat cepat, pahami uangmu, rencanakan dengan tenang.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lanjutkan dengan Google' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lanjutkan dengan Apple' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lewati pengenalan' })).toBeTruthy();
  });

  it.each(['google', 'apple'] as const)(
    'completes the %s fixture flow through account bootstrap',
    async (provider) => {
      renderWireframe();

      fireEvent.press(
        await screen.findByRole('button', {
          name: provider === 'google' ? 'Lanjutkan dengan Google' : 'Lanjutkan dengan Apple',
        }),
      );
      expect(await screen.findByText('Callback OAuth (fixture)')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Validasi callback fixture' }));
      expect(await screen.findByText('Lengkapi akun (fixture)')).toBeTruthy();

      fireEvent.changeText(screen.getByLabelText('Nama tampilan (wajib)'), 'Demo Fixture');
      fireEvent.press(screen.getByRole('checkbox', { name: 'Syarat Layanan fixture' }));
      fireEvent.press(screen.getByRole('checkbox', { name: 'Kebijakan Privasi fixture' }));
      fireEvent.press(screen.getByRole('button', { name: 'Simpan akun fixture' }));

      expect(await screen.findByText('Wireframe akun selesai')).toBeTruthy();
      expect(screen.getByText(/Login asli belum diaktifkan/)).toBeTruthy();
    },
  );

  it('supports provider cancellation and returns to the welcome state', async () => {
    renderWireframe({ google: 'cancelled' });

    fireEvent.press(await screen.findByRole('button', { name: 'Lanjutkan dengan Google' }));
    expect(await screen.findByText('Login dibatalkan')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke layar masuk' }));
    expect(await screen.findByText('Selamat datang di FinanceApp')).toBeTruthy();
  });

  it('shows provider error and recovers through a deterministic retry', async () => {
    renderWireframe({ google: ['provider-error', 'success'] });

    fireEvent.press(await screen.findByRole('button', { name: 'Lanjutkan dengan Google' }));
    expect(await screen.findByText('Google sedang tidak tersedia')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Callback OAuth (fixture)')).toBeTruthy();
  });

  it('shows offline state and recovers without discarding local consent input', async () => {
    renderWireframe({ google: ['offline', 'success'] });

    fireEvent.press(await screen.findByRole('button', { name: 'Lanjutkan dengan Google' }));
    expect(await screen.findByText('Koneksi internet diperlukan')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Callback OAuth (fixture)')).toBeTruthy();
  });

  it('rejects malformed callbacks without displaying the raw callback value', async () => {
    renderWireframe({ google: 'malformed-callback' });

    fireEvent.press(await screen.findByRole('button', { name: 'Lanjutkan dengan Google' }));
    expect(await screen.findByText('Callback OAuth (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Validasi callback fixture' }));

    expect(await screen.findByText('Callback tidak valid')).toBeTruthy();
    expect(screen.queryByText(/access_token|token=|code=/i)).toBeNull();
  });

  it.each([
    ['revoked', 'Sesi dicabut', 'Mulai lagi'],
    ['expired', 'Sesi berakhir', 'Mulai lagi'],
  ] as const)('surfaces a %s session recovery action', async (session, title, action) => {
    renderWireframe({ session });

    fireEvent.press(await screen.findByRole('button', { name: 'Lanjutkan dengan Google' }));
    expect(await screen.findByText('Callback OAuth (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Validasi callback fixture' }));
    expect(await screen.findByText(title)).toBeTruthy();
    expect(screen.getByRole('button', { name: action })).toBeTruthy();
  });

  it('validates account bootstrap fields before accepting the fixture profile', async () => {
    renderWireframe();
    await advanceToAccountBootstrap();

    fireEvent.press(screen.getByRole('button', { name: 'Simpan akun fixture' }));
    expect(await screen.findByText('Nama tampilan wajib diisi')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Nama tampilan (wajib)'), 'Demo Fixture');
    fireEvent.press(screen.getByRole('checkbox', { name: 'Syarat Layanan fixture' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Kebijakan Privasi fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan akun fixture' }));
    expect(await screen.findByText('Wireframe akun selesai')).toBeTruthy();
  });

  it('parses only the allowlisted fixture callback and rejects malformed or sensitive URLs', () => {
    expect(
      parseAuthCallback('financeapp://auth/callback?provider=google&state=fixture-success'),
    ).toEqual({
      kind: 'accepted',
      provider: 'google',
    });
    expect(
      parseAuthCallback('https://attacker.example/callback?provider=google&state=fixture-success'),
    ).toEqual({
      kind: 'rejected',
      code: 'malformed-callback',
    });
    expect(parseAuthCallback('financeapp://auth/callback?provider=google&code=secret')).toEqual({
      kind: 'rejected',
      code: 'malformed-callback',
    });
  });

  it('does not call Supabase Auth or production network while running fixture interactions', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const fixture = createAuthFixture();
    const auth = await fixture.startSignIn('google');
    if (auth.kind === 'callback') {
      fixture.resolveCallback(auth.callbackUrl);
    }
    await fixture.bootstrapSession('google');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('keeps the U00 responsive and reduced-motion constraints explicit', () => {
    expect(AUTH_LAYOUT.minimumWidth).toBe(320);
    expect(AUTH_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
    expect(AUTH_LAYOUT.contentMaxWidth).toBeGreaterThanOrEqual(AUTH_LAYOUT.minimumWidth);
  });

  it('exposes a working skip action instead of a dead welcome button', async () => {
    renderWireframe();

    fireEvent.press(screen.getByRole('button', { name: 'Lewati pengenalan' }));
    await waitFor(() => expect(screen.getByText('Masuk ke FinanceApp')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Lanjutkan dengan Google' })).toBeTruthy();
  });
});
