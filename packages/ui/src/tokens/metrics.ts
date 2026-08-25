export const spacing = {
  space0: 0,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48,
  space16: 64,
} as const;

export type SpacingName = keyof typeof spacing;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const stroke = {
  hairline: 1,
  control: 1.5,
  focus: 2,
} as const;

export const interaction = {
  minimumTouchTarget: 48,
  buttonHeight: 52,
  compactButtonHeight: 48,
  minimumAdjacentTargetGap: 8,
  focusOffset: 2,
  pressedOpacity: 0.82,
  pressedReducedOpacity: 0.88,
  disabledOpacity: 0.58,
  skeletonBaseOpacity: 0.65,
  skeletonLowOpacity: 0.35,
} as const;

export const componentMetrics = {
  fieldLabelGap: 6,
  supportingTextGap: 6,
  buttonContentGap: 8,
  cardContentGap: 12,
  iconContainer: 40,
  rowMinHeight: 68,
  chartMinHeight: 160,
  chartSummaryMaxWidth: 680,
  dialogMaxWidth: 520,
  emptyMessageMaxWidth: 420,
  errorMessageMaxWidth: 680,
  toastMessageMinWidth: 160,
  toastDuration: 5000,
  bannerMessageMinWidth: 180,
  sheetMaxHeight: '90%',
  skeletonDefaultHeight: 16,
} as const;

export const icon = {
  small: 20,
  medium: 24,
  selectedStrokeWidth: 2.5,
  strokeWidth: 2,
} as const;

export const motion = {
  instant: { duration: 100, easing: 'ease-out' },
  fast: { duration: 180, easing: 'ease-out' },
  base: { duration: 240, easing: 'standard' },
  slow: { duration: 360, easing: 'ease-in-out' },
} as const;

export interface ElevationStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const lightElevation = {
  level0: {
    shadowColor: '#2F241C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#2F241C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  level2: {
    shadowColor: '#2F241C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  level3: {
    shadowColor: '#2F241C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
} as const satisfies Record<string, ElevationStyle>;

export const darkElevation = {
  level0: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
    elevation: 2,
  },
  level2: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 6,
  },
  level3: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
} as const satisfies Record<string, ElevationStyle>;

export type ElevationLevel = keyof typeof lightElevation;
