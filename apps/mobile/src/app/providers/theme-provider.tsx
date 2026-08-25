import {
  ThemeProvider as UiThemeProvider,
  useTheme as useUiTheme,
  type ThemeContextValue as UiThemeContextValue,
  type ThemeProviderProps as UiThemeProviderProps,
  type ThemeColors,
} from '@financeapp/ui';

export type { ThemeColors } from '@financeapp/ui';

export interface ThemeContextValue extends UiThemeContextValue {
  colors: ThemeColors;
}

export type ThemeProviderProps = UiThemeProviderProps;

export function ThemeProvider({ children, scheme, reducedMotion }: ThemeProviderProps) {
  return (
    <UiThemeProvider reducedMotion={reducedMotion} scheme={scheme}>
      {children}
    </UiThemeProvider>
  );
}

export function useTheme(): ThemeContextValue {
  const theme = useUiTheme();
  return { ...theme, colors: theme.tokens.colors };
}
