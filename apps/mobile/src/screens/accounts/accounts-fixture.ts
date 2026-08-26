import { formatAmountMinor, parseAmountMinor } from '@financeapp/domain';

export const SUPPORTED_ACCOUNT_TYPES = [
  'cash',
  'bank',
  'e_wallet',
  'credit_card',
  'investment',
  'loan',
  'receivable',
  'other',
] as const;

export type AccountType = (typeof SUPPORTED_ACCOUNT_TYPES)[number];
export type BalanceKind = 'asset' | 'liability';
export type TrackingMode = 'transactional' | 'non_transactional';
export type AccessMode = 'personal' | 'household';
export type AccountState = 'local_only' | 'sync_pending' | 'synced' | 'conflict' | 'archived';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Kas',
  bank: 'Bank',
  e_wallet: 'E-wallet',
  credit_card: 'Kartu kredit',
  investment: 'Investasi',
  loan: 'Pinjaman',
  receivable: 'Piutang',
  other: 'Lainnya',
};

export const SUPPORTED_ACCOUNT_CURRENCIES = [
  { code: 'IDR', label: 'Indonesian Rupiah', exponent: 0 },
  { code: 'USD', label: 'US Dollar', exponent: 2 },
  { code: 'JPY', label: 'Japanese Yen', exponent: 0 },
] as const;

export type SupportedAccountCurrency = (typeof SUPPORTED_ACCOUNT_CURRENCIES)[number]['code'];

export const ACCOUNT_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

export interface ValuationEntry {
  id: string;
  valueMinor: string;
  valuedAt: string;
}

export interface Account {
  id: string;
  type: AccountType;
  balanceKind: BalanceKind;
  trackingMode: TrackingMode;
  name: string;
  institutionLabel: string;
  currency: SupportedAccountCurrency;
  lastFour?: string;
  openingBalanceMinor: string;
  openingBalanceAt: string;
  includeInNetWorth: boolean;
  accessMode: AccessMode;
  state: AccountState;
  hasActivity?: boolean;
  valuationHistory?: ValuationEntry[];
  outstandingPrincipalMinor?: string;
  dueDate?: string;
  scheduledPaymentMinor?: string;
  trackingLabel?: string;
}

export interface AccountDraft {
  type: AccountType;
  balanceKind: BalanceKind;
  trackingMode: TrackingMode;
  name: string;
  institutionLabel: string;
  currency: SupportedAccountCurrency;
  lastFour?: string;
  openingBalanceMajor: string;
  openingBalanceAt: string;
  includeInNetWorth: boolean;
  accessMode: AccessMode;
}

export type AccountsLoadOutcome =
  'loading' | 'ready' | 'empty' | 'offline' | 'syncing' | 'partial_currency' | 'error';
export type AccountsSaveOutcome = 'local_only' | 'sync-pending' | 'synced' | 'conflict' | 'error';
export type ArchiveOutcome = 'success' | 'dependency-blocked' | 'error';

export interface AccountsScenario {
  initialAccounts?: Account[];
  loadOutcomes?: readonly AccountsLoadOutcome[];
  saveOutcomes?: readonly AccountsSaveOutcome[];
  archiveOutcomes?: readonly ArchiveOutcome[];
}

export type AccountsLoadResult =
  | { kind: 'loaded'; accounts: Account[]; partialCurrency: boolean }
  | { kind: 'empty' }
  | { kind: 'offline' }
  | { kind: 'syncing' }
  | { kind: 'error' };

export type AccountsSaveResult =
  | { kind: 'local_only'; account: Account }
  | { kind: 'sync-pending'; account: Account }
  | { kind: 'synced'; account: Account }
  | { kind: 'conflict'; device: Account; server: Account }
  | { kind: 'error' };

export type ArchiveResult =
  { kind: 'success'; account: Account } | { kind: 'dependency-blocked' } | { kind: 'error' };

export interface NetWorthSubtotal {
  currency: SupportedAccountCurrency;
  minor: string;
}

export interface NetWorthSummary {
  byCurrency: NetWorthSubtotal[];
  incomplete: boolean;
  doubleCountPrevented: boolean;
}

export interface AccountsFixture {
  load(): Promise<AccountsLoadResult>;
  useLocalAccounts(): Promise<AccountsLoadResult>;
  save(draft: AccountDraft): Promise<AccountsSaveResult>;
  resolveConflict(choice: 'device' | 'server'): Promise<{ kind: 'synced'; account: Account }>;
  archive(id: string): Promise<ArchiveResult>;
  restore(id: string): Promise<Account | undefined>;
  addValuation(id: string, valueMajor: string, valuedAt: string): Promise<Account | undefined>;
  snapshot(): Account[];
  previewNetWorth(accounts: Account[]): NetWorthSummary;
}

export const DEFAULT_ACCOUNT_FIXTURES: Account[] = [
  {
    id: 'account-cash-fixture',
    type: 'cash',
    balanceKind: 'asset',
    trackingMode: 'transactional',
    name: 'Kas fixture',
    institutionLabel: 'Dompet rumah',
    currency: 'IDR',
    lastFour: '0001',
    openingBalanceMinor: '500000',
    openingBalanceAt: '2026-08-01',
    includeInNetWorth: true,
    accessMode: 'personal',
    state: 'synced',
    hasActivity: true,
  },
  {
    id: 'account-bank-fixture',
    type: 'bank',
    balanceKind: 'asset',
    trackingMode: 'transactional',
    name: 'Bank fixture',
    institutionLabel: 'Bank lokal',
    currency: 'IDR',
    lastFour: '1002',
    openingBalanceMinor: '2500000',
    openingBalanceAt: '2026-08-01',
    includeInNetWorth: true,
    accessMode: 'household',
    state: 'synced',
    hasActivity: true,
  },
  {
    id: 'account-wallet-fixture',
    type: 'e_wallet',
    balanceKind: 'asset',
    trackingMode: 'transactional',
    name: 'Dompet digital fixture',
    institutionLabel: 'E-wallet fixture',
    currency: 'IDR',
    openingBalanceMinor: '125000',
    openingBalanceAt: '2026-08-01',
    includeInNetWorth: true,
    accessMode: 'personal',
    state: 'sync_pending',
    hasActivity: false,
  },
  {
    id: 'account-card-fixture',
    type: 'credit_card',
    balanceKind: 'liability',
    trackingMode: 'transactional',
    name: 'Kartu kredit fixture',
    institutionLabel: 'Bank kartu',
    currency: 'IDR',
    lastFour: '4321',
    openingBalanceMinor: '450000',
    openingBalanceAt: '2026-08-01',
    includeInNetWorth: true,
    accessMode: 'personal',
    state: 'synced',
    hasActivity: true,
    outstandingPrincipalMinor: '450000',
  },
  {
    id: 'account-investment-fixture',
    type: 'investment',
    balanceKind: 'asset',
    trackingMode: 'non_transactional',
    name: 'Investasi fixture',
    institutionLabel: 'Broker fixture',
    currency: 'USD',
    openingBalanceMinor: '0',
    openingBalanceAt: '2026-08-01',
    includeInNetWorth: true,
    accessMode: 'personal',
    state: 'synced',
    hasActivity: false,
    valuationHistory: [{ id: 'valuation-fixture', valueMinor: '120000', valuedAt: '2026-08-25' }],
  },
  {
    id: 'account-loan-fixture',
    type: 'loan',
    balanceKind: 'liability',
    trackingMode: 'transactional',
    name: 'Pinjaman fixture',
    institutionLabel: 'Bank kredit',
    currency: 'IDR',
    openingBalanceMinor: '2500000',
    openingBalanceAt: '2026-08-01',
    includeInNetWorth: true,
    accessMode: 'household',
    state: 'synced',
    hasActivity: true,
    outstandingPrincipalMinor: '2500000',
    dueDate: '2026-09-05',
    scheduledPaymentMinor: '250000',
    trackingLabel: 'Manual shell fixture',
  },
  {
    id: 'account-receivable-fixture',
    type: 'receivable',
    balanceKind: 'asset',
    trackingMode: 'transactional',
    name: 'Piutang fixture',
    institutionLabel: 'Kontak fixture',
    currency: 'JPY',
    openingBalanceMinor: '80000',
    openingBalanceAt: '2026-08-01',
    includeInNetWorth: true,
    accessMode: 'personal',
    state: 'local_only',
    hasActivity: false,
  },
  {
    id: 'account-other-fixture',
    type: 'other',
    balanceKind: 'asset',
    trackingMode: 'non_transactional',
    name: 'Aset lain fixture',
    institutionLabel: 'Lokasi fixture',
    currency: 'IDR',
    openingBalanceMinor: '100000',
    openingBalanceAt: '2026-08-01',
    includeInNetWorth: false,
    accessMode: 'personal',
    state: 'archived',
    hasActivity: false,
    valuationHistory: [],
  },
];

function currencyExponent(currency: SupportedAccountCurrency): number {
  return SUPPORTED_ACCOUNT_CURRENCIES.find((item) => item.code === currency)?.exponent ?? 0;
}

function consumeOutcome<T extends string>(
  value: readonly T[] | undefined,
  fallback: T,
): { value: T; next: readonly T[] | undefined } {
  return { value: value?.[0] ?? fallback, next: value?.slice(1) };
}

function cloneAccount(account: Account): Account {
  return {
    ...account,
    valuationHistory: account.valuationHistory?.map((entry) => ({ ...entry })),
  };
}

function cloneAccounts(accounts: Account[]): Account[] {
  return accounts.map(cloneAccount);
}

function isSupportedCurrency(value: string): value is SupportedAccountCurrency {
  return SUPPORTED_ACCOUNT_CURRENCIES.some((item) => item.code === value);
}

export function parseOpeningBalanceMinor(input: string, currency: string): string {
  if (!isSupportedCurrency(currency)) throw new Error('Currency fixture tidak didukung');
  return parseAmountMinor(input.trim(), currencyExponent(currency)).toString();
}

export function validateAccountDraft(
  input: AccountDraft,
):
  | { valid: true }
  | { valid: false; fields: ('name' | 'currency' | 'lastFour' | 'openingBalance')[] } {
  const fields: ('name' | 'currency' | 'lastFour' | 'openingBalance')[] = [];
  if (input.name.trim().length === 0 || input.name.trim().length > 80) fields.push('name');
  if (!/^[A-Z]{3}$/.test(input.currency) || !isSupportedCurrency(input.currency)) {
    fields.push('currency');
  }
  if (input.lastFour && !/^\d{4}$/.test(input.lastFour)) fields.push('lastFour');
  if (isSupportedCurrency(input.currency)) {
    try {
      parseOpeningBalanceMinor(input.openingBalanceMajor || '0', input.currency);
    } catch {
      fields.push('openingBalance');
    }
  }
  return fields.length > 0 ? { valid: false, fields } : { valid: true };
}

function latestValuation(account: Account): string | null {
  const entries = account.valuationHistory ?? [];
  return entries.length > 0 ? (entries[entries.length - 1]?.valueMinor ?? null) : null;
}

export function calculateNetWorth(accounts: Account[]): NetWorthSummary {
  const subtotal = new Map<SupportedAccountCurrency, bigint>();
  for (const account of accounts) {
    if (!account.includeInNetWorth || account.state === 'archived') continue;
    const sourceMinor =
      account.trackingMode === 'non_transactional'
        ? (latestValuation(account) ?? '0')
        : account.openingBalanceMinor;
    const raw = BigInt(sourceMinor);
    const signed = account.balanceKind === 'liability' ? -(raw < 0n ? -raw : raw) : raw;
    subtotal.set(account.currency, (subtotal.get(account.currency) ?? 0n) + signed);
  }
  return {
    byCurrency: Array.from(subtotal.entries()).map(([currency, minor]) => ({
      currency,
      minor: minor.toString(),
    })),
    incomplete: subtotal.size > 1,
    doubleCountPrevented: true,
  };
}

function accountFromDraft(draft: AccountDraft, id: string, state: AccountState): Account {
  const openingBalanceMinor = parseOpeningBalanceMinor(
    draft.openingBalanceMajor || '0',
    draft.currency,
  );
  return {
    id,
    type: draft.type,
    balanceKind: draft.balanceKind,
    trackingMode: draft.trackingMode,
    name: draft.name.trim(),
    institutionLabel: draft.institutionLabel.trim(),
    currency: draft.currency,
    lastFour: draft.lastFour?.trim() || undefined,
    openingBalanceMinor,
    openingBalanceAt: draft.openingBalanceAt,
    includeInNetWorth: draft.includeInNetWorth,
    accessMode: draft.accessMode,
    state,
    hasActivity: false,
    valuationHistory: draft.trackingMode === 'non_transactional' ? [] : undefined,
    outstandingPrincipalMinor: draft.balanceKind === 'liability' ? openingBalanceMinor : undefined,
  };
}

export function createAccountsFixture(scenario: AccountsScenario = {}): AccountsFixture {
  let accounts = cloneAccounts(scenario.initialAccounts ?? DEFAULT_ACCOUNT_FIXTURES);
  let loadOutcomes = scenario.loadOutcomes;
  let saveOutcomes = scenario.saveOutcomes;
  let archiveOutcomes = scenario.archiveOutcomes;
  let lastSaved: Account | undefined;
  let conflictServer: Account | undefined;

  const resolveLoad = async (outcomes: readonly AccountsLoadOutcome[] | undefined) => {
    const consumed = consumeOutcome(outcomes, 'ready');
    if (outcomes === loadOutcomes) loadOutcomes = consumed.next;
    switch (consumed.value) {
      case 'empty':
        return { kind: 'empty' } as const;
      case 'offline':
        return { kind: 'offline' } as const;
      case 'syncing':
        return { kind: 'syncing' } as const;
      case 'error':
        return { kind: 'error' } as const;
      case 'partial_currency':
        return {
          kind: 'loaded',
          accounts: cloneAccounts(accounts),
          partialCurrency: true,
        } as const;
      default:
        return {
          kind: 'loaded',
          accounts: cloneAccounts(accounts),
          partialCurrency: false,
        } as const;
    }
  };

  return {
    load: () => resolveLoad(loadOutcomes),
    useLocalAccounts: async () => ({
      kind: 'loaded',
      accounts: cloneAccounts(accounts),
      partialCurrency: false,
    }),
    async save(draft) {
      const consumed = consumeOutcome(saveOutcomes, 'synced');
      saveOutcomes = consumed.next;
      const deviceAccount = accountFromDraft(
        draft,
        `account-${draft.name.toLowerCase().replace(/\s+/g, '-')}`,
        'synced',
      );
      lastSaved = deviceAccount;
      if (consumed.value === 'error') return { kind: 'error' };
      if (consumed.value === 'sync-pending') {
        const pending = { ...deviceAccount, state: 'sync_pending' as const };
        accounts = [...accounts, pending];
        return { kind: 'sync-pending', account: cloneAccount(pending) };
      }
      if (consumed.value === 'local_only') {
        const local = { ...deviceAccount, state: 'local_only' as const };
        accounts = [...accounts, local];
        return { kind: 'local_only', account: cloneAccount(local) };
      }
      if (consumed.value === 'conflict') {
        conflictServer = { ...deviceAccount, name: 'Nama akun sebelumnya', state: 'synced' };
        return {
          kind: 'conflict',
          device: cloneAccount(deviceAccount),
          server: cloneAccount(conflictServer),
        };
      }
      accounts = [...accounts, deviceAccount];
      return { kind: 'synced', account: cloneAccount(deviceAccount) };
    },
    async resolveConflict(choice) {
      const selected = choice === 'device' ? lastSaved : conflictServer;
      if (!selected) throw new Error('Tidak ada konflik fixture');
      accounts = [
        ...accounts.filter((item) => item.id !== selected.id),
        { ...selected, state: 'synced' },
      ];
      return { kind: 'synced', account: cloneAccount(selected) };
    },
    async archive(id) {
      const consumed = consumeOutcome(archiveOutcomes, 'success');
      archiveOutcomes = consumed.next;
      const account = accounts.find((item) => item.id === id);
      if (!account || consumed.value === 'error') return { kind: 'error' };
      if (consumed.value === 'dependency-blocked') return { kind: 'dependency-blocked' };
      const archived = { ...account, state: 'archived' as const };
      accounts = accounts.map((item) => (item.id === id ? archived : item));
      return { kind: 'success', account: cloneAccount(archived) };
    },
    async restore(id) {
      const account = accounts.find((item) => item.id === id);
      if (!account) return undefined;
      const restored = { ...account, state: 'synced' as const };
      accounts = accounts.map((item) => (item.id === id ? restored : item));
      return cloneAccount(restored);
    },
    async addValuation(id, valueMajor, valuedAt) {
      const account = accounts.find((item) => item.id === id);
      if (!account || account.trackingMode !== 'non_transactional') return undefined;
      const valueMinor = parseOpeningBalanceMinor(valueMajor, account.currency);
      const updated = {
        ...account,
        valuationHistory: [
          ...(account.valuationHistory ?? []),
          { id: `valuation-${(account.valuationHistory?.length ?? 0) + 1}`, valueMinor, valuedAt },
        ],
      };
      accounts = accounts.map((item) => (item.id === id ? updated : item));
      return cloneAccount(updated);
    },
    snapshot: () => cloneAccounts(accounts),
    previewNetWorth: calculateNetWorth,
  };
}

export { formatAmountMinor };
