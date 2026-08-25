import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  AUTH_LAYOUT,
  AUTH_PROVIDER_LABELS,
  createAuthFixture,
  DEFAULT_ACCOUNT_BOOTSTRAP_INPUT,
  type AccountBootstrapInput,
  type AuthCallbackParams,
  type AuthFixture,
  type AuthProvider,
  type FixtureUser,
} from './auth-bootstrap-fixture';

type RecoveryAction = 'sign-in' | 'session';

type WireframeState =
  | { step: 'welcome'; skipped: boolean }
  | { step: 'authenticating'; provider: AuthProvider }
  | { step: 'callback'; provider: AuthProvider; callbackUrl: string }
  | { step: 'session-bootstrap'; provider: AuthProvider }
  | {
      step: 'account-bootstrap';
      provider: AuthProvider;
      user: FixtureUser;
    }
  | { step: 'complete'; displayName: string; provider: AuthProvider }
  | { step: 'cancelled'; provider: AuthProvider }
  | { step: 'offline'; provider: AuthProvider; retry: RecoveryAction }
  | { step: 'revoked'; provider: AuthProvider }
  | { step: 'expired'; provider: AuthProvider }
  | { step: 'error'; provider: AuthProvider; retry: RecoveryAction; code: ErrorCode };

type ErrorCode = 'provider-error' | 'malformed-callback' | 'session-error';

export interface AuthBootstrapWireframeProps {
  fixture?: AuthFixture;
  initialCallbackUrl?: string;
  initialCallbackParams?: AuthCallbackParams;
}

function initialState({
  initialCallbackUrl,
  initialCallbackParams,
}: Pick<
  AuthBootstrapWireframeProps,
  'initialCallbackUrl' | 'initialCallbackParams'
>): WireframeState {
  if (initialCallbackUrl) {
    return { step: 'callback', provider: 'google', callbackUrl: initialCallbackUrl };
  }
  if (initialCallbackParams) {
    const callback = parseAuthCallbackParamsSafely(initialCallbackParams);
    if (callback.kind === 'accepted') {
      return {
        step: 'callback',
        provider: callback.provider,
        callbackUrl: `financeapp://auth/callback?provider=${callback.provider}&state=fixture-success`,
      };
    }
    return { step: 'error', provider: 'google', retry: 'sign-in', code: 'malformed-callback' };
  }
  return { step: 'welcome', skipped: false };
}

function parseAuthCallbackParamsSafely(params: AuthCallbackParams) {
  const fixture = createAuthFixture();
  return fixture.resolveCallbackParams(params);
}

function providerTitle(provider: AuthProvider): string {
  return AUTH_PROVIDER_LABELS[provider];
}

function errorTitle(code: ErrorCode, provider: AuthProvider): string {
  switch (code) {
    case 'provider-error':
      return `${providerTitle(provider)} sedang tidak tersedia`;
    case 'malformed-callback':
      return 'Callback tidak valid';
    case 'session-error':
      return 'Sesi fixture gagal dipulihkan';
  }
}

function accountErrorMessage(fields: string[]): string {
  if (fields.includes('displayName')) return 'Nama tampilan wajib diisi';
  if (fields.includes('termsAccepted')) return 'Setujui Syarat Layanan fixture';
  if (fields.includes('privacyAccepted')) return 'Setujui Kebijakan Privasi fixture';
  return 'Periksa data akun fixture';
}

export function AuthBootstrapWireframe({
  fixture: fixtureProp,
  initialCallbackUrl,
  initialCallbackParams,
}: AuthBootstrapWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const fixture = useMemo(() => fixtureProp ?? createAuthFixture(), [fixtureProp]);
  const [state, setState] = useState<WireframeState>(() =>
    initialState({ initialCallbackUrl, initialCallbackParams }),
  );
  const [accountInput, setAccountInput] = useState<AccountBootstrapInput>(
    DEFAULT_ACCOUNT_BOOTSTRAP_INPUT,
  );
  const [accountError, setAccountError] = useState<string | null>(null);

  const updateAccount = (patch: Partial<AccountBootstrapInput>) => {
    setAccountInput((current) => ({ ...current, ...patch }));
    setAccountError(null);
  };

  const showAccountBootstrap = (provider: AuthProvider, user: FixtureUser) => {
    setAccountInput(DEFAULT_ACCOUNT_BOOTSTRAP_INPUT);
    setAccountError(null);
    setState({ step: 'account-bootstrap', provider, user });
  };

  const bootstrapSession = (provider: AuthProvider) => {
    setState({ step: 'session-bootstrap', provider });
    void fixture.bootstrapSession(provider).then((result) => {
      switch (result.kind) {
        case 'valid':
          showAccountBootstrap(provider, result.user);
          break;
        case 'offline':
          setState({ step: 'offline', provider, retry: 'session' });
          break;
        case 'revoked':
          setState({ step: 'revoked', provider });
          break;
        case 'expired':
          setState({ step: 'expired', provider });
          break;
        case 'error':
          setState({ step: 'error', provider, retry: 'session', code: 'session-error' });
          break;
      }
    });
  };

  const validateCallback = (provider: AuthProvider, callbackUrl: string) => {
    setState({ step: 'session-bootstrap', provider });
    const callback = fixture.resolveCallback(callbackUrl);
    if (callback.kind === 'rejected') {
      setState({ step: 'error', provider, retry: 'sign-in', code: 'malformed-callback' });
      return;
    }
    bootstrapSession(callback.provider);
  };

  const startSignIn = (provider: AuthProvider) => {
    setState({ step: 'authenticating', provider });
    void fixture.startSignIn(provider).then((result) => {
      switch (result.kind) {
        case 'callback':
          setState({
            step: 'callback',
            provider: result.provider,
            callbackUrl: result.callbackUrl,
          });
          break;
        case 'cancelled':
          setState({ step: 'cancelled', provider: result.provider });
          break;
        case 'provider-error':
          setState({
            step: 'error',
            provider: result.provider,
            retry: 'sign-in',
            code: 'provider-error',
          });
          break;
        case 'offline':
          setState({ step: 'offline', provider: result.provider, retry: 'sign-in' });
          break;
      }
    });
  };

  const retry = (action: RecoveryAction, provider: AuthProvider) => {
    if (action === 'session') {
      bootstrapSession(provider);
      return;
    }
    startSignIn(provider);
  };

  const reset = () => {
    setAccountInput(DEFAULT_ACCOUNT_BOOTSTRAP_INPUT);
    setAccountError(null);
    setState({ step: 'welcome', skipped: false });
  };

  const content = useMemo(() => {
    switch (state.step) {
      case 'welcome':
        return (
          <>
            <Text
              style={[
                tokens.typography.heading1,
                styles.heading,
                { color: tokens.colors.textPrimary },
              ]}
            >
              {state.skipped ? 'Masuk ke FinanceApp' : 'Selamat datang di FinanceApp'}
            </Text>
            <Text
              style={[
                tokens.typography.bodyLarge,
                styles.lead,
                { color: tokens.colors.textSecondary },
              ]}
            >
              Catat cepat, pahami uangmu, rencanakan dengan tenang.
            </Text>
            <Card padding="space5" style={styles.card}>
              <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
                Masuk dengan aman
              </Text>
              <Text
                style={[
                  tokens.typography.bodyLarge,
                  styles.cardCopy,
                  { color: tokens.colors.textSecondary },
                ]}
              >
                Ini wireframe fixture untuk meninjau alur. Login asli belum diaktifkan dan tidak ada
                token yang disimpan.
              </Text>
              <View style={styles.actions}>
                <Button
                  label="Lanjutkan dengan Google"
                  accessibilityLabel="Lanjutkan dengan Google"
                  onPress={() => startSignIn('google')}
                />
                <Button
                  label="Lanjutkan dengan Apple"
                  accessibilityLabel="Lanjutkan dengan Apple"
                  variant="secondary"
                  onPress={() => startSignIn('apple')}
                />
              </View>
            </Card>
            <Button
              label="Lewati pengenalan"
              accessibilityLabel="Lewati pengenalan"
              variant="tertiary"
              onPress={() => setState({ step: 'welcome', skipped: true })}
            />
          </>
        );
      case 'authenticating':
        return (
          <StatusState
            title={`Membuka ${providerTitle(state.provider)} fixture`}
            body="Menyiapkan hasil deterministic. Tidak ada browser atau provider produksi yang dibuka."
            reducedMotion={reducedMotion}
          >
            <Button
              label="Batalkan autentikasi fixture"
              variant="tertiary"
              onPress={() => setState({ step: 'cancelled', provider: state.provider })}
            />
          </StatusState>
        );
      case 'callback':
        return (
          <StatusState
            title="Callback OAuth (fixture)"
            body="Callback hanya berisi provider dan state fixture yang allowlisted. Validasi dilanjutkan secara lokal."
            reducedMotion={reducedMotion}
          >
            <Button
              label="Validasi callback fixture"
              accessibilityLabel="Validasi callback fixture"
              onPress={() => validateCallback(state.provider, state.callbackUrl)}
            />
            <Button
              label="Batal dan kembali"
              variant="tertiary"
              onPress={() => setState({ step: 'welcome', skipped: false })}
            />
          </StatusState>
        );
      case 'session-bootstrap':
        return (
          <StatusState
            title="Memulihkan sesi fixture"
            body="Memeriksa status sesi mock tanpa secure storage, Supabase Auth, atau network."
            reducedMotion={reducedMotion}
          >
            <Button
              label="Batalkan pemulihan sesi"
              variant="tertiary"
              onPress={() => setState({ step: 'welcome', skipped: false })}
            />
          </StatusState>
        );
      case 'account-bootstrap':
        return (
          <>
            <Text
              style={[
                tokens.typography.heading1,
                styles.heading,
                { color: tokens.colors.textPrimary },
              ]}
            >
              Lengkapi akun (fixture)
            </Text>
            <Text
              style={[
                tokens.typography.bodyLarge,
                styles.lead,
                { color: tokens.colors.textSecondary },
              ]}
            >
              Data ini hanya mock lokal untuk menguji validasi onboarding.
            </Text>
            <Card padding="space5" style={styles.card}>
              <Input
                label="Nama tampilan"
                required
                value={accountInput.displayName}
                onChangeText={(displayName) => updateAccount({ displayName })}
                accessibilityLabel="Nama tampilan (wajib)"
                placeholder="Contoh: Deni"
                autoCapitalize="words"
              />
              <Checkbox
                label="Syarat Layanan fixture"
                checked={accountInput.termsAccepted}
                onPress={() => updateAccount({ termsAccepted: !accountInput.termsAccepted })}
              />
              <Checkbox
                label="Kebijakan Privasi fixture"
                checked={accountInput.privacyAccepted}
                onPress={() => updateAccount({ privacyAccepted: !accountInput.privacyAccepted })}
              />
              {accountError ? (
                <Text
                  accessibilityRole="alert"
                  style={[
                    tokens.typography.bodyLarge,
                    styles.error,
                    { color: tokens.colors.danger },
                  ]}
                >
                  {accountError}
                </Text>
              ) : null}
              <Text
                style={[
                  tokens.typography.caption,
                  styles.fixtureNote,
                  { color: tokens.colors.textSecondary },
                ]}
              >
                Locale id-ID · IDR · Asia/Jakarta
              </Text>
              <Button
                label="Simpan akun fixture"
                accessibilityLabel="Simpan akun fixture"
                onPress={() => {
                  void fixture.bootstrapAccount(accountInput, state.user).then((result) => {
                    if (result.kind === 'validation-error') {
                      setAccountError(accountErrorMessage(result.fields));
                      return;
                    }
                    setState({
                      step: 'complete',
                      displayName: result.displayName,
                      provider: result.provider,
                    });
                  });
                }}
              />
            </Card>
            <Button label="Kembali ke layar masuk" variant="tertiary" onPress={reset} />
          </>
        );
      case 'complete':
        return (
          <StatusState
            title="Wireframe akun selesai"
            body={`${state.displayName} · ${providerTitle(state.provider)} fixture. Login asli belum diaktifkan.`}
            reducedMotion={reducedMotion}
          >
            <Button label="Ulangi alur fixture" onPress={reset} />
          </StatusState>
        );
      case 'cancelled':
        return (
          <StatusState
            title="Login dibatalkan"
            body="Tidak ada toast merah dan tidak ada sesi yang dibuat."
          >
            <Button label="Kembali ke layar masuk" onPress={reset} />
          </StatusState>
        );
      case 'offline':
        return (
          <StatusState
            title="Koneksi internet diperlukan"
            body="Status offline fixture dipertahankan; input lokal tidak dihapus."
          >
            <Button label="Coba lagi" onPress={() => retry(state.retry, state.provider)} />
            <Button label="Kembali ke layar masuk" variant="tertiary" onPress={reset} />
          </StatusState>
        );
      case 'revoked':
        return (
          <StatusState
            title="Sesi dicabut"
            body="Sesi fixture dicabut. Masuk ulang diperlukan untuk melanjutkan."
          >
            <Button label="Mulai lagi" onPress={reset} />
          </StatusState>
        );
      case 'expired':
        return (
          <StatusState
            title="Sesi berakhir"
            body="Sesi fixture kedaluwarsa dan tidak membuka data finansial apa pun."
          >
            <Button label="Mulai lagi" onPress={reset} />
          </StatusState>
        );
      case 'error':
        return (
          <StatusState
            title={errorTitle(state.code, state.provider)}
            body="Coba lagi atau kembali ke layar masuk. Tidak ada credential yang dikirim."
          >
            <Button label="Coba lagi" onPress={() => retry(state.retry, state.provider)} />
            <Button label="Kembali ke layar masuk" variant="tertiary" onPress={reset} />
          </StatusState>
        );
    }
  }, [accountInput, accountError, fixture, reducedMotion, state, tokens]);
  return (
    <ScrollView
      testID="auth-bootstrap-scroll"
      accessibilityLabel="Alur autentikasi dan bootstrap akun fixture"
      contentContainerStyle={[
        styles.content,
        { backgroundColor: tokens.colors.canvas, paddingHorizontal: tokens.spacing.space6 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

function StatusState({
  title,
  body,
  children,
  reducedMotion = false,
}: {
  title: string;
  body: string;
  children: ReactNode;
  reducedMotion?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={styles.statusState}>
      <Text
        style={[tokens.typography.heading1, styles.heading, { color: tokens.colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text
        style={[tokens.typography.bodyLarge, styles.lead, { color: tokens.colors.textSecondary }]}
      >
        {body}
      </Text>
      {reducedMotion ? (
        <View
          testID="auth-reduced-motion-indicator"
          accessible={false}
          style={[styles.motionIndicator, { backgroundColor: tokens.colors.primary }]}
        />
      ) : null}
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

function Checkbox({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkbox}
    >
      <View
        accessible={false}
        style={[
          styles.checkboxMark,
          {
            borderColor: tokens.colors.borderStrong,
            backgroundColor: checked ? tokens.colors.primary : tokens.colors.surface,
          },
        ]}
      >
        {checked ? <Text style={{ color: tokens.colors.onPrimary }}>✓</Text> : null}
      </View>
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.checkboxLabel,
          { color: tokens.colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: AUTH_LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  heading: {
    textAlign: 'left',
  },
  lead: {
    textAlign: 'left',
  },
  card: {
    width: '100%',
  },
  cardCopy: {
    marginTop: 12,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
  statusState: {
    width: '100%',
  },
  motionIndicator: {
    borderRadius: 99,
    height: 8,
    marginTop: 20,
    width: 8,
  },
  checkbox: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: AUTH_LAYOUT.minimumTouchTarget,
    marginTop: 12,
  },
  checkboxMark: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 12,
  },
  error: {
    marginTop: 12,
  },
  fixtureNote: {
    marginTop: 12,
  },
});
