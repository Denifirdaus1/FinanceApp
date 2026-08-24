import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { QueryProvider } from './query-provider';
import { SessionProvider } from './session-provider';
import { ThemeProvider } from './theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <SessionProvider>{children}</SessionProvider>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
