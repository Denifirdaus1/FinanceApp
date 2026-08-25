export interface ChartColors {
  primary: string;
  success: string;
  info: string;
  danger: string;
  plum: string;
  amber: string;
}

export interface PastelColors {
  peach: string;
  sage: string;
  dustyBlue: string;
  plum: string;
  amber: string;
}

export interface DisabledColors {
  surface: string;
  text: string;
  border: string;
}

export interface ThemeColors {
  canvas: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  borderStrong: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  scrim: string;
  skeleton: string;
  pastel: PastelColors;
  disabled: DisabledColors;
  chart: ChartColors;
}

export const lightColors = {
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
  scrim: '#2F241C99',
  skeleton: '#E9DDCE',
  pastel: {
    peach: '#F0DDC5',
    sage: '#DCE9DD',
    dustyBlue: '#DCE8F2',
    plum: '#E4D9EC',
    amber: '#F3E0C3',
  },
  disabled: {
    surface: '#F6EDDF',
    text: '#67584A',
    border: '#927D69',
  },
  chart: {
    primary: '#7A5C3E',
    success: '#2F6B4F',
    info: '#355F87',
    danger: '#A13B32',
    plum: '#6F4E8C',
    amber: '#8A4B0F',
  },
} as const satisfies ThemeColors;

export const darkColors = {
  canvas: '#17130F',
  surface: '#211B16',
  surfaceRaised: '#2C241D',
  surfaceMuted: '#352B23',
  textPrimary: '#FFF7EC',
  textSecondary: '#DCCDBD',
  textMuted: '#BBAA99',
  borderSubtle: '#4E4034',
  borderStrong: '#776552',
  primary: '#E3B98B',
  onPrimary: '#2A1C10',
  primaryContainer: '#4C3725',
  onPrimaryContainer: '#FFE4C6',
  success: '#7CC9A4',
  warning: '#F3BA74',
  danger: '#F49A91',
  info: '#8CC4F7',
  scrim: '#000000B3',
  skeleton: '#40352B',
  pastel: {
    peach: '#4C3725',
    sage: '#2F493D',
    dustyBlue: '#2E4355',
    plum: '#4A3656',
    amber: '#4E3D25',
  },
  disabled: {
    surface: '#352B23',
    text: '#DCCDBD',
    border: '#BBAA99',
  },
  chart: {
    primary: '#E3B98B',
    success: '#7CC9A4',
    info: '#8CC4F7',
    danger: '#F49A91',
    plum: '#C5A7E8',
    amber: '#F3BA74',
  },
} as const satisfies ThemeColors;
