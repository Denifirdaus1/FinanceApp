export const FINANCIAL_PROFILE_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 520,
} as const;

export const SUPPORTED_LOCALES = [
  { code: 'id-ID', label: 'Indonesia', direction: 'ltr' },
  { code: 'en-US', label: 'English', direction: 'ltr' },
  { code: 'ar-EG', label: 'العربية', direction: 'rtl' },
] as const;

export const SUPPORTED_TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Singapore',
  'UTC',
  'America/Los_Angeles',
] as const;

export const SUPPORTED_CURRENCIES = [
  { code: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp', minorUnit: 0 },
  { code: 'USD', label: 'US Dollar', symbol: '$', minorUnit: 2 },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', minorUnit: 0 },
] as const;

export const SUPPORTED_DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
export const SUPPORTED_THEMES = ['system', 'light', 'dark'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]['code'];
export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]['code'];
export type DateFormat = (typeof SUPPORTED_DATE_FORMATS)[number];
export type ThemeChoice = (typeof SUPPORTED_THEMES)[number];

export interface FinancialPreferences {
  displayName: string;
  locale: string;
  timezone: string;
  baseCurrency: string;
  financialMonthStart: number;
  weekStartsOn: number;
  dateFormat: string;
  theme: string;
  maskAmounts: boolean;
  analyticsEnabled: boolean;
  hideInAppSwitcher: boolean;
  biometricLock: boolean;
  reminderEnabled: boolean;
  weeklySummaryEnabled: boolean;
  budgetAlertEnabled: boolean;
}

export const DEFAULT_FINANCIAL_PREFERENCES: FinancialPreferences = {
  displayName: 'Pengguna Fixture',
  locale: 'id-ID',
  timezone: 'Asia/Jakarta',
  baseCurrency: 'IDR',
  financialMonthStart: 1,
  weekStartsOn: 1,
  dateFormat: 'DD/MM/YYYY',
  theme: 'system',
  maskAmounts: false,
  analyticsEnabled: true,
  hideInAppSwitcher: false,
  biometricLock: false,
  reminderEnabled: true,
  weeklySummaryEnabled: true,
  budgetAlertEnabled: true,
};

export type FinancialProfileLoadOutcome = 'loaded' | 'offline' | 'error';
export type FinancialProfileSaveOutcome = 'synced' | 'sync-pending' | 'conflict' | 'error';

export interface FinancialProfileScenario {
  initialPreferences?: Partial<FinancialPreferences>;
  loadOutcomes?: FinancialProfileLoadOutcome | readonly FinancialProfileLoadOutcome[];
  saveOutcomes?: FinancialProfileSaveOutcome | readonly FinancialProfileSaveOutcome[];
}

export type FinancialValidationField = keyof FinancialPreferences;

export type FinancialValidationResult =
  { valid: true } | { valid: false; fields: FinancialValidationField[] };

export type FinancialProfileLoadResult =
  { kind: 'loaded'; preferences: FinancialPreferences } | { kind: 'offline' } | { kind: 'error' };

export type FinancialProfileSaveResult =
  | { kind: 'synced'; preferences: FinancialPreferences }
  | { kind: 'sync-pending'; preferences: FinancialPreferences }
  | {
      kind: 'conflict';
      device: FinancialPreferences;
      server: FinancialPreferences;
    }
  | { kind: 'error' };

export interface FinancialProfilePreview {
  amount: string;
  date: string;
  locale: SupportedLocale;
  timezone: SupportedTimezone;
}

export interface FinancialProfileFixture {
  load(): Promise<FinancialProfileLoadResult>;
  save(input: FinancialPreferences): Promise<FinancialProfileSaveResult>;
  resolveConflict(choice: 'device' | 'server'): Promise<FinancialProfileSaveResult>;
  preview(preferences: FinancialPreferences): FinancialProfilePreview;
}

function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.some((item) => item.code === value);
}

function isSupportedTimezone(value: string): value is SupportedTimezone {
  return SUPPORTED_TIMEZONES.includes(value as SupportedTimezone);
}

function isSupportedCurrency(value: string): value is SupportedCurrency {
  return SUPPORTED_CURRENCIES.some((item) => item.code === value);
}

function isSupportedDateFormat(value: string): value is DateFormat {
  return SUPPORTED_DATE_FORMATS.includes(value as DateFormat);
}

function isSupportedTheme(value: string): value is ThemeChoice {
  return SUPPORTED_THEMES.includes(value as ThemeChoice);
}

export function resolveLocaleForRender(value: string): {
  value: SupportedLocale;
  fallback: boolean;
} {
  return isSupportedLocale(value) ? { value, fallback: false } : { value: 'id-ID', fallback: true };
}

export function resolveTimezoneForRender(value: string): {
  value: SupportedTimezone | null;
  fallback: boolean;
} {
  return isSupportedTimezone(value) ? { value, fallback: false } : { value: null, fallback: false };
}

export function validateFinancialPreferences(
  input: FinancialPreferences,
): FinancialValidationResult {
  const fields: FinancialValidationField[] = [];
  if (!isSupportedLocale(input.locale)) fields.push('locale');
  if (!isSupportedTimezone(input.timezone)) fields.push('timezone');
  if (!/^[A-Z]{3}$/.test(input.baseCurrency) || !isSupportedCurrency(input.baseCurrency)) {
    fields.push('baseCurrency');
  }
  if (input.weekStartsOn !== 1 && input.weekStartsOn !== 7) fields.push('weekStartsOn');
  if (
    !Number.isInteger(input.financialMonthStart) ||
    input.financialMonthStart < 1 ||
    input.financialMonthStart > 28
  ) {
    fields.push('financialMonthStart');
  }
  if (!isSupportedDateFormat(input.dateFormat)) fields.push('dateFormat');
  if (!isSupportedTheme(input.theme)) fields.push('theme');
  if (input.displayName.trim().length < 1 || input.displayName.trim().length > 80) {
    fields.push('displayName');
  }
  return fields.length === 0 ? { valid: true } : { valid: false, fields };
}

function consumeOutcome<T extends string>(
  value: T | readonly T[] | undefined,
  fallback: T,
): { value: T; next: T | readonly T[] | undefined } {
  if (Array.isArray(value)) {
    return { value: (value[0] as T | undefined) ?? fallback, next: value.slice(1) };
  }
  return { value: (value as T | undefined) ?? fallback, next: value as T | undefined };
}

function clonePreferences(input: FinancialPreferences): FinancialPreferences {
  return { ...input };
}

function currencyMetadata(code: string) {
  return SUPPORTED_CURRENCIES.find((item) => item.code === code) ?? SUPPORTED_CURRENCIES[0];
}

export function createFinancialProfileFixture(
  scenario: FinancialProfileScenario = {},
): FinancialProfileFixture {
  let loadOutcomes = scenario.loadOutcomes;
  let saveOutcomes = scenario.saveOutcomes;
  let preferences = {
    ...DEFAULT_FINANCIAL_PREFERENCES,
    ...scenario.initialPreferences,
  };
  let lastSavedInput = clonePreferences(preferences);
  let conflictValues: { device: FinancialPreferences; server: FinancialPreferences } | null = null;

  return {
    async load() {
      const consumed = consumeOutcome(loadOutcomes, 'loaded');
      loadOutcomes = consumed.next;
      if (consumed.value === 'offline') return { kind: 'offline' };
      if (consumed.value === 'error') return { kind: 'error' };
      return { kind: 'loaded', preferences: clonePreferences(preferences) };
    },
    async save(input) {
      lastSavedInput = clonePreferences(input);
      const consumed = consumeOutcome(saveOutcomes, 'synced');
      saveOutcomes = consumed.next;
      if (consumed.value === 'sync-pending') {
        preferences = clonePreferences(input);
        return { kind: 'sync-pending', preferences: clonePreferences(input) };
      }
      if (consumed.value === 'error') return { kind: 'error' };
      if (consumed.value === 'conflict') {
        conflictValues = {
          device: { ...input, baseCurrency: 'USD' },
          server: { ...input, baseCurrency: 'IDR' },
        };
        return {
          kind: 'conflict',
          device: clonePreferences(conflictValues.device),
          server: clonePreferences(conflictValues.server),
        };
      }
      preferences = clonePreferences(input);
      return { kind: 'synced', preferences: clonePreferences(input) };
    },
    async resolveConflict(choice) {
      const selected = conflictValues?.[choice] ?? lastSavedInput;
      preferences = clonePreferences(selected);
      conflictValues = null;
      return { kind: 'synced', preferences: clonePreferences(selected) };
    },
    preview(input) {
      const locale = resolveLocaleForRender(input.locale).value;
      const timezone = resolveTimezoneForRender(input.timezone).value ?? 'Asia/Jakarta';
      const metadata = currencyMetadata(input.baseCurrency);
      const amount = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: metadata.code,
        maximumFractionDigits: metadata.minorUnit,
      }).format(125000);
      const date = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeZone: timezone,
      }).format(new Date('2026-08-25T00:00:00.000Z'));
      return { amount, date, locale, timezone };
    },
  };
}
