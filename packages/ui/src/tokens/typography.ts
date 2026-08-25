import type { TextStyle } from 'react-native';

export const fontFamilies = {
  interface: 'Plus Jakarta Sans',
  iosFallback: 'SF Pro Text',
  androidFallback: 'Roboto',
  systemFallback: 'sans-serif',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamilies.interface,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  heading1: {
    fontFamily: fontFamilies.interface,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },
  heading2: {
    fontFamily: fontFamilies.interface,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  heading3: {
    fontFamily: fontFamilies.interface,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  title: {
    fontFamily: fontFamilies.interface,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  bodyLarge: {
    fontFamily: fontFamilies.interface,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  body: {
    fontFamily: fontFamilies.interface,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  label: {
    fontFamily: fontFamilies.interface,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  caption: {
    fontFamily: fontFamilies.interface,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  amountHero: {
    fontFamily: fontFamilies.interface,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  amountCard: {
    fontFamily: fontFamilies.interface,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  amountRow: {
    fontFamily: fontFamilies.interface,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyName = keyof typeof typography;
export type TypographyTokens = typeof typography;
