import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme, type ColorSchemeName } from 'react-native';

import { getTheme, type ColorScheme, type ThemeTokens } from '../tokens';

export interface ThemeContextValue {
  scheme: ColorScheme;
  tokens: ThemeTokens;
  reducedMotion: boolean;
}

export interface ThemeProviderProps {
  children: ReactNode;
  scheme?: ColorScheme;
  reducedMotion?: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function usePlatformReducedMotion(override?: boolean): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (override !== undefined) {
      return undefined;
    }
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReducedMotion(enabled);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [override]);

  return override ?? reducedMotion;
}

function resolveScheme(systemScheme: ColorSchemeName, requestedScheme?: ColorScheme): ColorScheme {
  if (requestedScheme) {
    return requestedScheme;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children, scheme, reducedMotion }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const resolvedScheme = resolveScheme(systemScheme, scheme);
  const platformReducedMotion = usePlatformReducedMotion(reducedMotion);
  const tokens = useMemo(() => getTheme(resolvedScheme), [resolvedScheme]);
  const value = useMemo(
    () => ({
      scheme: resolvedScheme,
      tokens,
      reducedMotion: platformReducedMotion,
    }),
    [platformReducedMotion, resolvedScheme, tokens],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function useReducedMotion(): boolean {
  return useTheme().reducedMotion;
}
