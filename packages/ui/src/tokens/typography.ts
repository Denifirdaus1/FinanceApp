import type { TextStyle } from 'react-native';

export const fontFamilies = {
  interface: 'PlusJakartaSans_400Regular',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  iosFallback: 'SF Pro Text',
  androidFallback: 'Roboto',
  systemFallback: 'sans-serif',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  heading1: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
  },
  heading2: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  heading3: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    lineHeight: 28,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    lineHeight: 26,
  },
  bodyLarge: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  amountHero: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    lineHeight: 44,
    fontVariant: ['tabular-nums'],
  },
  amountCard: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  amountRow: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyName = keyof typeof typography;
export type TypographyTokens = typeof typography;
