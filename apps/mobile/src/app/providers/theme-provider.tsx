import { createContext, useContext, useMemo, type ReactNode } from 'react';

const themeColors = {
  canvas: '#FFF9F0',
  surface: '#FFFDF8',
  surfaceRaised: '#FFFFFF',
  surfaceMuted: '#F6EDDF',
  textPrimary: '#2F241C',
  textSecondary: '#67584A',
  textMuted: '#756655',
  borderSubtle: '#D8C9B8',
  borderStrong: '#927D69',
  primary: '#7A5C3E',
  onPrimary: '#FFFDF8',
  primaryContainer: '#F0DDC5',
  onPrimaryContainer: '#49301D',
  success: '#2F6B4F',
  warning: '#8A4B0F',
  danger: '#A13B32',
  info: '#355F87',
} as const;

export type ThemeColors = typeof themeColors;

export interface ThemeContextValue {
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ colors: themeColors }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
