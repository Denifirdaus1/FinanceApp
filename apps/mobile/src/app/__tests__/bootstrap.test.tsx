import { fireEvent, render } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { GlobalErrorBoundary } from '../errors/error-boundary';
import { defaultSessionAdapter } from '../session/fake-session-adapter';

const LOADING_TEXT = 'Memuat aplikasi…';
const ERROR_TITLE = 'Terjadi kesalahan';
const RETRY_LABEL = 'Coba lagi';
const OFFLINE_TITLE = 'Kamu sedang offline';
const NOT_FOUND_TITLE = 'Halaman tidak ditemukan';
const PUBLIC_TAGLINE = 'Catat cepat, pahami uangmu, rencanakan dengan tenang.';
const APP_SHELL_TITLE = 'Beranda';

describe('app bootstrap', () => {
  beforeEach(() => {
    defaultSessionAdapter.reset();
  });

  it('shows the bootstrap loading screen while the session is loading', async () => {
    defaultSessionAdapter.setLoading();
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByText(LOADING_TEXT)).toBeTruthy();
    expect(screen.queryByText(PUBLIC_TAGLINE)).toBeNull();
    expect(screen.queryByText(APP_SHELL_TITLE)).toBeNull();
  });

  it('routes a signed-out user to the public landing', async () => {
    defaultSessionAdapter.setSignedOut();
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByText(PUBLIC_TAGLINE)).toBeTruthy();
    expect(screen.queryByText(APP_SHELL_TITLE)).toBeNull();
  });

  it('routes a signed-in user to the authenticated shell', async () => {
    defaultSessionAdapter.setSignedIn({ id: 'user-1', displayName: 'Pengguna Uji' });
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByText(APP_SHELL_TITLE)).toBeTruthy();
    expect(screen.queryByText(PUBLIC_TAGLINE)).toBeNull();
  });

  it('returns a revoked session to the public route', async () => {
    defaultSessionAdapter.setRevoked();
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByText(PUBLIC_TAGLINE)).toBeTruthy();
    expect(screen.queryByText(APP_SHELL_TITLE)).toBeNull();
  });

  it('shows a retry action when bootstrap fails and recovers after retry', async () => {
    defaultSessionAdapter.setSignedOut();
    defaultSessionAdapter.setFailBootstrap(true);
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByText(ERROR_TITLE)).toBeTruthy();
    expect(screen.getByText(RETRY_LABEL)).toBeTruthy();
    expect(screen.queryByText(PUBLIC_TAGLINE)).toBeNull();

    defaultSessionAdapter.setFailBootstrap(false);
    fireEvent.press(screen.getByText(RETRY_LABEL));
    expect(await screen.findByText(PUBLIC_TAGLINE)).toBeTruthy();
  });

  it('shows the offline screen when bootstrap fails while offline', async () => {
    defaultSessionAdapter.setFailBootstrap(true);
    defaultSessionAdapter.setOffline(true);
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByText(OFFLINE_TITLE)).toBeTruthy();
    expect(screen.getByText(RETRY_LABEL)).toBeTruthy();
  });

  it('renders not-found for unknown deep links without leaking private data', async () => {
    defaultSessionAdapter.setSignedOut();
    renderRouter('app', { initialUrl: '/rahasia-pengguna' });
    expect(await screen.findByText(NOT_FOUND_TITLE)).toBeTruthy();
    expect(screen.queryByText(APP_SHELL_TITLE)).toBeNull();
    expect(screen.queryByText(PUBLIC_TAGLINE)).toBeNull();
  });

  it('renders not-found for unknown deep links when signed in', async () => {
    defaultSessionAdapter.setSignedIn({ id: 'user-1', displayName: 'Pengguna Uji' });
    renderRouter('app', { initialUrl: '/rahasia-pengguna' });
    expect(await screen.findByText(NOT_FOUND_TITLE)).toBeTruthy();
    expect(screen.queryByText(APP_SHELL_TITLE)).toBeNull();
  });

  it('announces bootstrap status changes for accessibility', async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
    defaultSessionAdapter.setSignedIn({ id: 'user-1', displayName: 'Pengguna Uji' });
    renderRouter('app', { initialUrl: '/' });
    await screen.findByText(APP_SHELL_TITLE);
    expect(announce).toHaveBeenCalled();
    announce.mockRestore();
  });

  it('error boundary renders a generic fallback without sensitive details', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Boom(): React.JSX.Element {
      throw new Error('SENSITIVE_TOKEN_XYZ');
    }
    render(
      <GlobalErrorBoundary>
        <Boom />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText(ERROR_TITLE)).toBeTruthy();
    expect(screen.queryByText(/SENSITIVE_TOKEN_XYZ/)).toBeNull();
    consoleError.mockRestore();
  });
});
