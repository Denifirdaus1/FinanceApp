import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  ACCOUNT_LAYOUT,
  ACCOUNT_TYPE_LABELS,
  SUPPORTED_ACCOUNT_CURRENCIES,
  SUPPORTED_ACCOUNT_TYPES,
  calculateNetWorth,
  createAccountsFixture,
  formatAmountMinor,
  validateAccountDraft,
  type Account,
  type AccountDraft,
  type AccountsFixture,
  type AccountsScenario,
  type AccountsSaveResult,
} from './accounts-fixture';

type ScreenMode =
  | 'loading'
  | 'list'
  | 'empty'
  | 'offline'
  | 'syncing'
  | 'partial'
  | 'error'
  | 'detail'
  | 'create'
  | 'edit'
  | 'save-pending'
  | 'saved'
  | 'conflict'
  | 'archive-blocked'
  | 'archived'
  | 'restored'
  | 'valuation'
  | 'valuation-saved';

export interface AccountsWireframeProps {
  fixture?: AccountsFixture;
  onBack?: () => void;
}

const DEFAULT_DRAFT: AccountDraft = {
  type: 'cash',
  balanceKind: 'asset',
  trackingMode: 'transactional',
  name: '',
  institutionLabel: '',
  currency: 'IDR',
  lastFour: '',
  openingBalanceMajor: '0',
  openingBalanceAt: '2026-08-26',
  includeInNetWorth: true,
  accessMode: 'personal',
};

const EMPTY_SCENARIO: AccountsScenario = {};

function currencyExponent(currency: Account['currency']): number {
  return SUPPORTED_ACCOUNT_CURRENCIES.find((item) => item.code === currency)?.exponent ?? 0;
}

function formatAccountAmount(minor: string, currency: Account['currency']): string {
  const amount = formatAmountMinor(BigInt(minor), currencyExponent(currency));
  const symbol = currency === 'IDR' ? 'Rp' : currency === 'USD' ? '$' : '¥';
  return `${symbol} ${amount}`;
}

function draftFromAccount(account: Account): AccountDraft {
  return {
    type: account.type,
    balanceKind: account.balanceKind,
    trackingMode: account.trackingMode,
    name: account.name,
    institutionLabel: account.institutionLabel,
    currency: account.currency,
    lastFour: account.lastFour ?? '',
    openingBalanceMajor: account.openingBalanceMinor,
    openingBalanceAt: account.openingBalanceAt,
    includeInNetWorth: account.includeInNetWorth,
    accessMode: account.accessMode,
  };
}

function OptionButton({
  label,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const optionStyle = [
    styles.option,
    {
      backgroundColor: selected ? tokens.colors.surfaceMuted : tokens.colors.surface,
      borderColor: selected ? tokens.colors.primary : tokens.colors.borderStrong,
      opacity: disabled ? tokens.interaction.disabledOpacity : 1,
    },
  ];
  const optionContent = (
    <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>{label}</Text>
  );
  if (disabled) {
    return (
      <View
        accessible
        accessibilityLabel={label}
        accessibilityRole="radio"
        accessibilityState={{ disabled, selected }}
        {...({ disabled: true } as object)}
        style={optionStyle}
      >
        {optionContent}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={optionStyle}
    >
      {optionContent}
    </Pressable>
  );
}

function StatusState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.statusState}>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text
        style={[tokens.typography.bodyLarge, styles.lead, { color: tokens.colors.textSecondary }]}
      >
        {body}
      </Text>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

export function AccountsWireframe({ fixture: suppliedFixture, onBack }: AccountsWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createAccountsFixture(EMPTY_SCENARIO));
  const fixture = suppliedFixture ?? fallbackFixture;
  const [mode, setMode] = useState<ScreenMode>('loading');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccountDraft>(DEFAULT_DRAFT);
  const [formError, setFormError] = useState<string | undefined>();
  const [selectedAfterSave, setSelectedAfterSave] = useState<Account | null>(null);
  const [conflict, setConflict] = useState<{ device: Account; server: Account } | null>(null);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [valuation, setValuation] = useState({ value: '', date: '2026-08-26' });

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedId) ?? null,
    [accounts, selectedId],
  );
  const netWorth = useMemo(() => calculateNetWorth(accounts), [accounts]);

  const loadAccounts = useCallback(async () => {
    setMode('loading');
    const result = await fixture.load();
    if (result.kind === 'loaded') {
      setAccounts(result.accounts);
      setMode(result.partialCurrency ? 'partial' : result.accounts.length === 0 ? 'empty' : 'list');
      return;
    }
    setMode(result.kind);
  }, [fixture]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const openAccount = (account: Account) => {
    setSelectedId(account.id);
    setMode('detail');
    setArchiveDialog(false);
  };

  const openCreate = () => {
    setDraft(DEFAULT_DRAFT);
    setFormError(undefined);
    setSelectedId(null);
    setMode('create');
  };

  const saveDraft = async () => {
    const validation = validateAccountDraft(draft);
    if (!validation.valid) {
      const messages: string[] = [];
      if (validation.fields.includes('name')) messages.push('Nama akun wajib diisi');
      if (validation.fields.includes('currency'))
        messages.push('Mata uang harus ISO 4217 uppercase');
      if (validation.fields.includes('lastFour'))
        messages.push('Empat digit terakhir harus empat angka');
      if (validation.fields.includes('openingBalance'))
        messages.push('Saldo awal harus berupa angka minor yang valid');
      setFormError(messages.join('. '));
      return;
    }
    setFormError(undefined);
    const result = await fixture.save(draft);
    applySaveResult(result);
  };

  const applySaveResult = (result: AccountsSaveResult) => {
    if (result.kind === 'error') {
      setFormError('Akun gagal disimpan. Coba lagi.');
      return;
    }
    if (result.kind === 'conflict') {
      setConflict({ device: result.device, server: result.server });
      setMode('conflict');
      return;
    }
    setAccounts(fixture.snapshot());
    setSelectedId(result.account.id);
    setSelectedAfterSave(result.account);
    setMode(result.kind === 'sync-pending' ? 'save-pending' : 'saved');
  };

  const retrySave = async () => {
    const result = await fixture.save(draft);
    applySaveResult(result);
  };

  const confirmArchive = async () => {
    if (!selectedAccount) return;
    const result = await fixture.archive(selectedAccount.id);
    setArchiveDialog(false);
    if (result.kind === 'dependency-blocked') {
      setMode('archive-blocked');
      return;
    }
    if (result.kind === 'success') {
      setAccounts(fixture.snapshot());
      setSelectedAfterSave(result.account);
      setMode('archived');
    }
  };

  const restoreAccount = async () => {
    if (!selectedId) return;
    const restored = await fixture.restore(selectedId);
    if (restored) {
      setAccounts(fixture.snapshot());
      setSelectedAfterSave(restored);
      setMode('restored');
    }
  };

  const saveValuation = async () => {
    if (!selectedAccount) return;
    const updated = await fixture.addValuation(selectedAccount.id, valuation.value, valuation.date);
    if (updated) {
      setAccounts(fixture.snapshot());
      setMode('valuation-saved');
    }
  };

  const goBack = () => {
    if (
      mode === 'list' ||
      mode === 'empty' ||
      mode === 'offline' ||
      mode === 'error' ||
      mode === 'partial'
    ) {
      onBack?.();
      return;
    }
    setMode('list');
  };

  if (mode === 'loading') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Memuat akun fixture"
          body="Menyiapkan daftar akun lokal untuk wireframe."
        >
          <Button label="Memuat akun" loading loadingLabel="Memuat akun" />
        </StatusState>
      </View>
    );
  }
  if (mode === 'empty') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Belum ada akun fixture"
          body="Tambahkan akun pertama untuk melihat ringkasan."
        >
          <Button label="Tambah akun" onPress={openCreate} />
          <Button label="Coba lagi" variant="tertiary" onPress={() => void loadAccounts()} />
        </StatusState>
      </View>
    );
  }
  if (mode === 'offline') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Akun offline"
          body="Daftar fixture tidak tersedia dari sumber remote; data finansial tidak ditulis ke URL."
        >
          <Button label="Coba lagi" onPress={() => void loadAccounts()} />
        </StatusState>
      </View>
    );
  }
  if (mode === 'error') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Akun gagal dimuat"
          body="Periksa kembali sumber fixture lalu coba lagi."
        >
          <Button label="Coba lagi" onPress={() => void loadAccounts()} />
          <Button label="Kembali" variant="tertiary" onPress={goBack} />
        </StatusState>
      </View>
    );
  }
  if (mode === 'syncing') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Menyinkronkan akun fixture"
          body="Perubahan lokal sedang menunggu simulasi sinkronisasi."
        >
          <Button
            label="Lihat akun lokal"
            onPress={async () => {
              const result = await fixture.useLocalAccounts();
              if (result.kind === 'loaded') {
                setAccounts(result.accounts);
                setMode('list');
              }
            }}
          />
        </StatusState>
      </View>
    );
  }
  if (mode === 'archive-blocked') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Arsip tertahan oleh dependensi"
          body="Alihkan aturan atau recurring fixture terlebih dahulu"
        >
          <Button label="Kembali ke detail" onPress={() => setMode('detail')} />
          <Button label="Kembali" variant="tertiary" onPress={goBack} />
        </StatusState>
      </View>
    );
  }
  if (mode === 'save-pending') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Akun menunggu sinkronisasi (fixture)"
          body="Akun lokal dipertahankan dan belum dianggap sebagai sinkronisasi produksi."
        >
          <Button label="Coba sinkronisasi lagi" onPress={() => void retrySave()} />
          <Button label="Edit akun" variant="tertiary" onPress={() => setMode('create')} />
        </StatusState>
      </View>
    );
  }
  if (mode === 'conflict' && conflict) {
    return (
      <View style={styles.root}>
        <StatusState
          title="Konflik akun fixture"
          body="Pilih nilai fixture yang ingin dipertahankan."
        >
          <Card padding="space4" style={styles.card}>
            <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
              Perangkat: {conflict.device.name}
            </Text>
            <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
              Server: {conflict.server.name}
            </Text>
          </Card>
          <Button
            label="Gunakan nilai perangkat"
            onPress={async () => {
              const result = await fixture.resolveConflict('device');
              setAccounts(fixture.snapshot());
              setSelectedAfterSave(result.account);
              setMode('saved');
            }}
          />
          <Button
            label="Gunakan nilai server"
            variant="tertiary"
            onPress={async () => {
              const result = await fixture.resolveConflict('server');
              setAccounts(fixture.snapshot());
              setSelectedAfterSave(result.account);
              setMode('saved');
            }}
          />
        </StatusState>
      </View>
    );
  }
  if (mode === 'saved') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Akun tersimpan (fixture)"
          body="Perubahan hanya berada di fixture memory dan tidak memanggil network atau persistence."
        >
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
            {selectedAfterSave?.name}
          </Text>
          <Button label="Lihat semua akun" onPress={() => setMode('list')} />
        </StatusState>
      </View>
    );
  }
  if (mode === 'archived') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Akun diarsipkan (fixture)"
          body="Akun tidak dihapus dan histori tetap dipertahankan dalam fixture."
        >
          <Button label="Pulihkan akun" onPress={() => void restoreAccount()} />
          <Button label="Kembali" variant="tertiary" onPress={goBack} />
        </StatusState>
      </View>
    );
  }
  if (mode === 'restored') {
    return (
      <View style={styles.root}>
        <StatusState
          title="Akun dipulihkan (fixture)"
          body="Akun kembali tersedia sebagai presentasi read-only fixture."
        >
          <Button label="Lihat detail akun" onPress={() => setMode('detail')} />
          <Button label="Kembali" variant="tertiary" onPress={() => setMode('list')} />
        </StatusState>
      </View>
    );
  }
  if (mode === 'valuation' || mode === 'valuation-saved') {
    return (
      <View style={styles.root}>
        <ScrollView testID="accounts-scroll" contentContainerStyle={styles.content}>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}
          >
            Valuasi aset fixture
          </Text>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
            {selectedAccount?.name}
          </Text>
          <Input
            label="Nilai valuasi (major unit)"
            value={valuation.value}
            onChangeText={(value) => setValuation((current) => ({ ...current, value }))}
            keyboardType="decimal-pad"
            containerStyle={styles.input}
          />
          <Input
            label="Tanggal valuasi"
            value={valuation.date}
            onChangeText={(date) => setValuation((current) => ({ ...current, date }))}
            containerStyle={styles.input}
          />
          <Button label="Simpan valuasi fixture" onPress={() => void saveValuation()} />
          <Text
            style={[
              tokens.typography.heading2,
              styles.sectionTitle,
              { color: tokens.colors.textPrimary },
            ]}
          >
            Riwayat valuasi
          </Text>
          {(selectedAccount?.valuationHistory ?? []).map((entry) => (
            <Text
              key={entry.id}
              style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}
            >
              {entry.valuedAt}:{' '}
              {formatAccountAmount(entry.valueMinor, selectedAccount?.currency ?? 'IDR')}
            </Text>
          ))}
          {mode === 'valuation-saved' ? (
            <Text
              style={[
                tokens.typography.bodyLarge,
                styles.success,
                { color: tokens.colors.success },
              ]}
            >
              Valuasi tercatat (fixture)
            </Text>
          ) : null}
          <Button label="Kembali" variant="tertiary" onPress={() => setMode('detail')} />
        </ScrollView>
      </View>
    );
  }
  if (mode === 'create' || mode === 'edit') {
    return (
      <AccountForm
        mode={mode}
        draft={draft}
        setDraft={setDraft}
        formError={formError}
        selectedAccount={selectedAccount}
        onSave={() => void saveDraft()}
        onBack={() => setMode(selectedAccount ? 'detail' : 'list')}
      />
    );
  }
  if (mode === 'detail' && selectedAccount) {
    return (
      <AccountDetail
        account={selectedAccount}
        onBack={() => setMode('list')}
        onEdit={() => {
          setDraft(draftFromAccount(selectedAccount));
          setFormError(undefined);
          setMode('edit');
        }}
        onArchive={() => setArchiveDialog(true)}
        onValuation={() => {
          setValuation({ value: '', date: '2026-08-26' });
          setMode('valuation');
        }}
        archiveDialog={archiveDialog}
        onCancelArchive={() => setArchiveDialog(false)}
        onConfirmArchive={() => void confirmArchive()}
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView testID="accounts-scroll" contentContainerStyle={styles.content}>
        <View style={styles.motionIndicator} testID="accounts-reduced-motion-indicator">
          <Text style={styles.hiddenText}>
            {reducedMotion ? 'Reduced motion aktif' : 'Motion fixture'}
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}
        >
          Akun & aset
        </Text>
        <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
          Daftar akun, dompet, aset, dan liabilitas fixture.
        </Text>
        <View style={styles.actions}>
          <Button label="Tambah akun" onPress={openCreate} />
          <Button label="Kembali" variant="tertiary" onPress={goBack} />
        </View>
        {mode === 'partial' ? (
          <Card variant="muted" padding="space4" style={styles.card}>
            <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
              Kurs belum lengkap
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Total lintas mata uang belum dapat dihitung tanpa fixture FX.
            </Text>
          </Card>
        ) : null}
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Ringkasan net worth fixture
          </Text>
          {netWorth.byCurrency.map((item) => (
            <Text
              key={item.currency}
              style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}
            >
              <Text>Subtotal {item.currency}</Text>:{' '}
              {formatAccountAmount(item.minor, item.currency)}
            </Text>
          ))}
          {netWorth.incomplete ? (
            <Text style={[tokens.typography.body, { color: tokens.colors.warning }]}>
              Total belum lengkap
            </Text>
          ) : (
            <Text style={[tokens.typography.body, { color: tokens.colors.success }]}>
              Total lengkap
            </Text>
          )}
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Valuasi tidak dihitung dua kali
          </Text>
        </Card>
        {accounts.map((account) => (
          <Card key={account.id} padding="space4" style={styles.card}>
            <Button
              label={account.name}
              variant="secondary"
              accessibilityHint="Buka detail akun fixture"
              onPress={() => openAccount(account)}
            />
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              {ACCOUNT_TYPE_LABELS[account.type]}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              {account.balanceKind === 'asset' ? 'Asset' : 'Liabilitas'} · {account.state}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function AccountForm({
  mode,
  draft,
  setDraft,
  formError,
  selectedAccount,
  onSave,
  onBack,
}: {
  mode: 'create' | 'edit';
  draft: AccountDraft;
  setDraft: (value: AccountDraft) => void;
  formError?: string;
  selectedAccount: Account | null;
  onSave: () => void;
  onBack: () => void;
}) {
  const { tokens } = useTheme();
  const currencyLocked = mode === 'edit' && Boolean(selectedAccount?.hasActivity);
  return (
    <View style={styles.root}>
      <ScrollView testID="accounts-scroll" contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}
        >
          {mode === 'create' ? 'Buat akun fixture' : 'Edit akun'}
        </Text>
        <Input
          label="Nama akun"
          required
          value={draft.name}
          onChangeText={(name) => setDraft({ ...draft, name })}
          error={formError?.includes('Nama akun') ? 'Nama akun wajib diisi' : undefined}
          containerStyle={styles.input}
        />
        <Input
          label="Institusi"
          value={draft.institutionLabel}
          onChangeText={(institutionLabel) => setDraft({ ...draft, institutionLabel })}
          containerStyle={styles.input}
        />
        <Text
          style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
        >
          Jenis akun
        </Text>
        {SUPPORTED_ACCOUNT_TYPES.map((type) => (
          <OptionButton
            key={type}
            label={ACCOUNT_TYPE_LABELS[type]}
            selected={draft.type === type}
            onPress={() =>
              setDraft({
                ...draft,
                type,
                balanceKind: type === 'credit_card' || type === 'loan' ? 'liability' : 'asset',
                trackingMode:
                  type === 'investment' || type === 'other' ? 'non_transactional' : 'transactional',
              })
            }
          />
        ))}
        <Text
          style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
        >
          Jenis saldo
        </Text>
        <OptionButton
          label="Asset"
          selected={draft.balanceKind === 'asset'}
          onPress={() => setDraft({ ...draft, balanceKind: 'asset' })}
        />
        <OptionButton
          label="Liabilitas"
          selected={draft.balanceKind === 'liability'}
          onPress={() => setDraft({ ...draft, balanceKind: 'liability' })}
        />
        <Text
          style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
        >
          Mata uang
        </Text>
        {currencyLocked ? (
          <View>
            <Text style={[tokens.typography.body, { color: tokens.colors.warning }]}>
              Mata uang terkunci setelah activity
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.warning }]}>
              Buat akun baru untuk mata uang berbeda
            </Text>
          </View>
        ) : null}
        {SUPPORTED_ACCOUNT_CURRENCIES.map((currency) => (
          <OptionButton
            key={currency.code}
            label={`${currency.code} — ${currency.label}`}
            selected={draft.currency === currency.code}
            disabled={currencyLocked}
            onPress={() => setDraft({ ...draft, currency: currency.code })}
          />
        ))}
        <Input
          label="Empat digit terakhir"
          value={draft.lastFour ?? ''}
          onChangeText={(lastFour) => setDraft({ ...draft, lastFour })}
          keyboardType="number-pad"
          hint="Hanya metadata non-credential"
          containerStyle={styles.input}
          error={
            formError?.includes('Empat digit')
              ? 'Empat digit terakhir harus empat angka'
              : undefined
          }
        />
        <Input
          label="Saldo awal (major unit)"
          value={draft.openingBalanceMajor}
          onChangeText={(openingBalanceMajor) => setDraft({ ...draft, openingBalanceMajor })}
          keyboardType="decimal-pad"
          containerStyle={styles.input}
        />
        <Input
          label="Tanggal opening"
          value={draft.openingBalanceAt}
          onChangeText={(openingBalanceAt) => setDraft({ ...draft, openingBalanceAt })}
          containerStyle={styles.input}
        />
        <Text
          style={[tokens.typography.caption, styles.info, { color: tokens.colors.textSecondary }]}
        >
          Saldo awal tidak boleh diedit sebagai saldo berjalan
        </Text>
        <Button
          label={`Termasuk net worth: ${draft.includeInNetWorth ? 'ya' : 'tidak'}`}
          variant="secondary"
          onPress={() => setDraft({ ...draft, includeInNetWorth: !draft.includeInNetWorth })}
        />
        <Text
          style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
        >
          Mode akses
        </Text>
        <OptionButton
          label="Personal"
          selected={draft.accessMode === 'personal'}
          onPress={() => setDraft({ ...draft, accessMode: 'personal' })}
        />
        <OptionButton
          label="Household"
          selected={draft.accessMode === 'household'}
          onPress={() => setDraft({ ...draft, accessMode: 'household' })}
        />
        {formError ? (
          <Text
            accessibilityRole="alert"
            style={[tokens.typography.body, styles.error, { color: tokens.colors.danger }]}
          >
            {formError}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button label="Simpan akun fixture" onPress={onSave} />
          <Button label="Kembali" variant="tertiary" onPress={onBack} />
        </View>
      </ScrollView>
    </View>
  );
}

function AccountDetail({
  account,
  onBack,
  onEdit,
  onArchive,
  onValuation,
  archiveDialog,
  onCancelArchive,
  onConfirmArchive,
}: {
  account: Account;
  onBack: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onValuation: () => void;
  archiveDialog: boolean;
  onCancelArchive: () => void;
  onConfirmArchive: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.root}>
      <ScrollView testID="accounts-scroll" contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}
        >
          Detail akun
        </Text>
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            {account.name}
          </Text>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
            {ACCOUNT_TYPE_LABELS[account.type]} · {account.currency}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            {account.balanceKind === 'asset' ? 'Asset' : 'Liabilitas'} · {account.state}
          </Text>
          {account.type !== 'loan' ? (
            <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
              {formatAccountAmount(account.openingBalanceMinor, account.currency)}
            </Text>
          ) : null}
        </Card>
        {account.hasActivity ? (
          <View style={styles.info}>
            <Text style={[tokens.typography.body, { color: tokens.colors.warning }]}>
              Mata uang terkunci setelah activity
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.warning }]}>
              Buat akun baru untuk mata uang berbeda
            </Text>
          </View>
        ) : null}
        {account.type === 'loan' ? (
          <Card padding="space4" style={styles.card}>
            <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
              Liability/debt shell
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Outstanding principal
            </Text>
            <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
              {formatAccountAmount(account.outstandingPrincipalMinor ?? '0', account.currency)}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Tracking mode
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              {account.trackingLabel ?? account.trackingMode}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Tanggal jatuh tempo
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              {account.dueDate ?? 'Belum diatur'}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Pembayaran terjadwal
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              {account.scheduledPaymentMinor ?? '0'} minor units
            </Text>
          </Card>
        ) : null}
        {account.trackingMode === 'non_transactional' ? (
          <Button label="Catat valuasi fixture" onPress={onValuation} />
        ) : null}
        <View style={styles.actions}>
          <Button label="Edit akun" onPress={onEdit} />
          <Button label="Arsipkan akun" variant="destructive" onPress={onArchive} />
          <Button label="Kembali" variant="tertiary" onPress={onBack} />
        </View>
        {archiveDialog ? (
          <Card
            testID="account-archive-dialog"
            variant="muted"
            padding="space4"
            style={styles.dialog}
          >
            <Text
              accessibilityRole="alert"
              style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}
            >
              Konfirmasi arsip akun
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Histori fixture dipertahankan dan akun tidak dihapus permanen.
            </Text>
            <Button label="Batal arsip" variant="tertiary" onPress={onCancelArchive} />
            <Button label="Konfirmasi arsip" variant="destructive" onPress={onConfirmArchive} />
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: ACCOUNT_LAYOUT.minimumWidth, paddingHorizontal: 16 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: ACCOUNT_LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  statusState: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, gap: 12 },
  lead: { marginTop: 8 },
  actions: { gap: 12, marginTop: 8 },
  card: { width: '100%', gap: 8 },
  dialog: { marginTop: 8, gap: 12 },
  option: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: ACCOUNT_LAYOUT.minimumTouchTarget,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  groupLabel: { marginTop: 12, marginBottom: 0 },
  input: { marginTop: 12 },
  sectionTitle: { marginTop: 12 },
  info: { marginTop: 8 },
  error: { marginTop: 8 },
  success: { marginTop: 8 },
  motionIndicator: { height: 1, width: 1, opacity: 0 },
  hiddenText: { height: 1, width: 1 },
});
