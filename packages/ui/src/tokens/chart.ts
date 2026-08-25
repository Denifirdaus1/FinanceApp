import type { ChartColors } from './colors';

export interface ChartTokens {
  series: ChartColors;
  maxSeries: 6;
  alternativeMarks: Readonly<Record<keyof ChartColors, string>>;
  accessibilityHint: string;
}

export const lightChartTokens = {
  series: {
    primary: '#7A5C3E',
    success: '#2F6B4F',
    info: '#355F87',
    danger: '#A13B32',
    plum: '#6F4E8C',
    amber: '#8A4B0F',
  },
  maxSeries: 6,
  alternativeMarks: {
    primary: 'solid-circle',
    success: 'diagonal-square',
    info: 'dot-triangle',
    danger: 'cross-diamond',
    plum: 'horizontal-hexagon',
    amber: 'vertical-star',
  },
  accessibilityHint: 'Sediakan ringkasan teks dan alternatif tabel untuk setiap grafik.',
} as const satisfies ChartTokens;

export const darkChartTokens = {
  series: {
    primary: '#E3B98B',
    success: '#7CC9A4',
    info: '#8CC4F7',
    danger: '#F49A91',
    plum: '#C5A7E8',
    amber: '#F3BA74',
  },
  maxSeries: 6,
  alternativeMarks: {
    primary: 'solid-circle',
    success: 'diagonal-square',
    info: 'dot-triangle',
    danger: 'cross-diamond',
    plum: 'horizontal-hexagon',
    amber: 'vertical-star',
  },
  accessibilityHint: 'Sediakan ringkasan teks dan alternatif tabel untuk setiap grafik.',
} as const satisfies ChartTokens;
