import type { ChartTokens } from './chart';
import { darkChartTokens, lightChartTokens } from './chart';
import { darkColors, lightColors, type ThemeColors } from './colors';
import {
  darkElevation,
  icon,
  interaction,
  lightElevation,
  motion,
  radius,
  spacing,
  stroke,
  type ElevationLevel,
  type ElevationStyle,
} from './metrics';
import { typography, type TypographyTokens } from './typography';

export type ColorScheme = 'light' | 'dark';

export interface ThemeTokens {
  scheme: ColorScheme;
  colors: ThemeColors;
  typography: TypographyTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  stroke: typeof stroke;
  interaction: typeof interaction;
  icon: typeof icon;
  motion: typeof motion;
  elevation: Record<ElevationLevel, ElevationStyle>;
  chart: ChartTokens;
}

export const lightTheme = {
  scheme: 'light',
  colors: lightColors,
  typography,
  spacing,
  radius,
  stroke,
  interaction,
  icon,
  motion,
  elevation: lightElevation,
  chart: lightChartTokens,
} as const satisfies ThemeTokens;

export const darkTheme = {
  scheme: 'dark',
  colors: darkColors,
  typography,
  spacing,
  radius,
  stroke,
  interaction,
  icon,
  motion,
  elevation: darkElevation,
  chart: darkChartTokens,
} as const satisfies ThemeTokens;

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export function getTheme(scheme: ColorScheme): ThemeTokens {
  return themes[scheme];
}
