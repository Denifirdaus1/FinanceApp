import { Stack } from 'expo-router';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import { BootstrapLoadingScreen } from '../src/app/bootstrap/loading-screen';
import { OfflineScreen } from '../src/app/bootstrap/offline-screen';
import { ErrorScreen } from '../src/app/errors/error-screen';
import { GlobalErrorBoundary } from '../src/app/errors/error-boundary';
import { AppProviders } from '../src/app/providers';
import { useSession } from '../src/app/providers/session-provider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GlobalErrorBoundary>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </GlobalErrorBoundary>
  );
}

function RootNavigator() {
  const { state, retry } = useSession();
  const { status, offline } = state;

  useEffect(() => {
    if (status !== 'loading') {
      AccessibilityInfo.announceForAccessibility(`Status aplikasi: ${status}`);
    }
  }, [status]);

  if (status === 'loading') {
    return <BootstrapLoadingScreen />;
  }
  if (status === 'error' && offline) {
    return <OfflineScreen onRetry={retry} />;
  }
  if (status === 'error') {
    return <ErrorScreen onRetry={retry} />;
  }

  const authenticated = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {authenticated ? <Stack.Screen name="(app)" /> : <Stack.Screen name="(public)" />}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
