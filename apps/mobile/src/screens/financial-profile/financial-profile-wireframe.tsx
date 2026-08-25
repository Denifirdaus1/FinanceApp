import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  DEFAULT_FINANCIAL_PREFERENCES,
  FINANCIAL_PROFILE_LAYOUT,
  SUPPORTED_CURRENCIES,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_LOCALES,
  SUPPORTED_THEMES,
  SUPPORTED_TIMEZONES,
  createFinancialProfileFixture,
  resolveLocaleForRender,
  resolveTimezoneForRender,
  validateFinancialPreferences,
  type FinancialProfileFixture,
  type FinancialProfileLoadResult,
  type FinancialProfileSaveResult,
  type FinancialPreferences,
  type FinancialValidationField,
} from './financial-profile-fixture';

type ProfileStatus =
  | 'loading'
  | 'editing'
  | 'validating'
  | 'saving_local'
  | 'sync_pending'
  | 'synced'
  | 'conflict'
  | 'offline'
  | 'error';

type SaveAction = 'load' | 'save';

export interface FinancialProfileWireframeProps {
  fixture?: FinancialProfileFixture;
  onBack?: () => void;
}

const STEP_TITLES = ['Lokasi & waktu', 'Mata uang & periode', 'Privasi & preferensi'] as const;

function validationMessage(fields: FinancialValidationField[]): string {
  if (fields.includes('locale')) return 'Pilih locale dari katalog fixture yang didukung';
  if (fields.includes('timezone')) return 'Pilih timezone IANA dari katalog fixture';
  if (fields.includes('baseCurrency'))
    return 'Mata uang harus kode ISO 4217 uppercase yang tersedia';
  if (fields.includes('weekStartsOn')) return 'Awal minggu hanya Senin (1) atau Minggu (7)';
  if (fields.includes('financialMonthStart')) return 'Awal bulan finansial harus 1–28';
  if (fields.includes('dateFormat')) return 'Pilih format tanggal dari katalog fixture';
  if (fields.includes('displayName')) return 'Nama tampilan wajib 1–80 karakter';
  return 'Periksa kembali preferensi fixture';
}

function stepForValidation(fields: FinancialValidationField[]): number {
  if (fields.some((field) => ['locale', 'timezone'].includes(field))) return 0;
  if (
    fields.some((field) =>
      ['baseCurrency', 'financialMonthStart', 'weekStartsOn', 'dateFormat'].includes(field),
    )
  ) {
    return 1;
  }
  return 2;
}

export function FinancialProfileWireframe({
  fixture: fixtureProp,
  onBack,
}: FinancialProfileWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const fixture = useMemo(() => fixtureProp ?? createFinancialProfileFixture(), [fixtureProp]);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<FinancialPreferences>(
    DEFAULT_FINANCIAL_PREFERENCES,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<SaveAction>('load');
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [currencyChanged, setCurrencyChanged] = useState(false);
  const [conflict, setConflict] = useState<Extract<
    FinancialProfileSaveResult,
    { kind: 'conflict' }
  > | null>(null);

  const applyLoadResult = useCallback((result: FinancialProfileLoadResult) => {
    if (result.kind === 'loaded') {
      setPreferences(result.preferences);
      setStep(0);
      setValidationError(null);
      setStatus('editing');
      return;
    }
    if (result.kind === 'offline') {
      setLastAction('load');
      setStatus('offline');
      return;
    }
    setLastAction('load');
    setStatusError('Profil fixture gagal dimuat');
    setStatus('error');
  }, []);

  const load = useCallback(() => {
    setStatus('loading');
    setStatusError(null);
    void fixture.load().then(applyLoadResult);
  }, [applyLoadResult, fixture]);

  useEffect(() => {
    void fixture.load().then(applyLoadResult);
  }, [applyLoadResult, fixture]);

  const updatePreferences = (patch: Partial<FinancialPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
    setValidationError(null);
    setStatusError(null);
    if (status !== 'editing') setStatus('editing');
  };

  const save = () => {
    setLastAction('save');
    setStatus('validating');
    const validation = validateFinancialPreferences(preferences);
    if (!validation.valid) {
      setStep(stepForValidation(validation.fields));
      setValidationError(validationMessage(validation.fields));
      setStatus('editing');
      return;
    }

    setValidationError(null);
    setStatus('saving_local');
    void fixture.save(preferences).then((result) => {
      if (result.kind === 'synced') {
        setPreferences(result.preferences);
        setStatus('synced');
        return;
      }
      if (result.kind === 'sync-pending') {
        setPreferences(result.preferences);
        setStatus('sync_pending');
        return;
      }
      if (result.kind === 'conflict') {
        setConflict(result);
        setStatus('conflict');
        return;
      }
      setStatusError('Penyimpanan fixture gagal');
      setStatus('error');
    });
  };

  const retry = () => {
    if (lastAction === 'load') {
      load();
    } else {
      save();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep((current) => current - 1);
      return;
    }
    onBack?.();
  };

  const selectCurrency = (code: string) => {
    if (code === preferences.baseCurrency) return;
    setPendingCurrency(code);
  };

  const confirmCurrency = () => {
    if (!pendingCurrency) return;
    updatePreferences({ baseCurrency: pendingCurrency });
    setCurrencyChanged(true);
    setPendingCurrency(null);
  };

  const resolveConflict = (choice: 'device' | 'server') => {
    void fixture.resolveConflict(choice).then((result) => {
      if (result.kind === 'synced') {
        setPreferences(result.preferences);
        setConflict(null);
        setStatus('synced');
      }
    });
  };

  const preview = fixture.preview(preferences);
  const renderedLocale = resolveLocaleForRender(preferences.locale);
  const renderedTimezone = resolveTimezoneForRender(preferences.timezone);

  if (status === 'loading') {
    return (
      <StatusState
        accessibilityLabel="Memuat profil keuangan fixture"
        reducedMotion={reducedMotion}
        status="loading"
        title="Memuat profil keuangan fixture"
        body="Membaca default lokal secara deterministic."
      />
    );
  }

  if (status === 'offline') {
    return (
      <StatusState
        reducedMotion={reducedMotion}
        title="Profil keuangan offline"
        body="Nilai fixture belum dimuat. Tidak ada data yang ditimpa diam-diam."
      >
        <Button label="Coba lagi" onPress={retry} />
      </StatusState>
    );
  }

  if (status === 'error' && lastAction === 'load') {
    return (
      <StatusState
        reducedMotion={reducedMotion}
        title={statusError ?? 'Profil fixture gagal'}
        body="Periksa kembali lalu coba lagi."
      >
        <Button label="Coba lagi" onPress={retry} />
        <Button
          label="Kembali ke profil"
          variant="tertiary"
          onPress={onBack ?? (() => setStatus('editing'))}
        />
      </StatusState>
    );
  }

  if (status === 'validating' || status === 'saving_local') {
    return (
      <StatusState
        reducedMotion={reducedMotion}
        status="progress"
        title={
          status === 'validating' ? 'Memvalidasi preferensi fixture' : 'Menyimpan lokal fixture'
        }
        body="Perubahan hanya berada di fixture wireframe; persistence dan sync produksi belum aktif."
      />
    );
  }

  if (status === 'sync_pending') {
    return (
      <StatusState
        reducedMotion={reducedMotion}
        title="Menunggu sinkronisasi (fixture)"
        body="Perubahan lokal dipertahankan dan menunggu simulasi sinkronisasi."
      >
        <Button label="Coba sinkronisasi lagi" onPress={retry} />
        <Button label="Edit perubahan" variant="tertiary" onPress={() => setStatus('editing')} />
      </StatusState>
    );
  }

  if (status === 'conflict' && conflict) {
    return (
      <StatusState
        reducedMotion={reducedMotion}
        title="Konflik preferensi fixture"
        body="Mata uang dasar perlu dipilih eksplisit; perubahan field lain tidak dibuang."
      >
        <Card padding="space4" style={styles.conflictCard}>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
            Perangkat: {conflict.device.baseCurrency}
          </Text>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
            Server: {conflict.server.baseCurrency}
          </Text>
        </Card>
        <Button label="Gunakan nilai perangkat" onPress={() => resolveConflict('device')} />
        <Button
          label="Gunakan nilai server"
          variant="secondary"
          onPress={() => resolveConflict('server')}
        />
      </StatusState>
    );
  }

  if (status === 'error' && lastAction === 'save') {
    return (
      <StatusState
        reducedMotion={reducedMotion}
        title={statusError ?? 'Penyimpanan fixture gagal'}
        body="Perubahan lokal belum dikirim ke network. Coba lagi atau kembali mengedit fixture."
      >
        <Button label="Coba lagi" onPress={retry} />
        <Button label="Edit perubahan" variant="tertiary" onPress={() => setStatus('editing')} />
      </StatusState>
    );
  }

  if (status === 'synced') {
    return (
      <StatusState
        reducedMotion={reducedMotion}
        title="Preferensi tersinkron (fixture)"
        body="Profil keuangan siap untuk wireframe berikutnya. Tidak ada server mutation yang dikirim."
      >
        <Button label="Edit preferensi lagi" onPress={() => setStatus('editing')} />
        <Button label="Kembali ke profil" variant="tertiary" onPress={goBack} />
      </StatusState>
    );
  }

  return (
    <ScrollView
      testID="financial-profile-scroll"
      contentContainerStyle={[
        styles.content,
        { backgroundColor: tokens.colors.canvas, paddingHorizontal: tokens.spacing.space6 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {reducedMotion ? (
        <View
          testID="financial-profile-reduced-motion-indicator"
          accessible={false}
          style={[styles.motionIndicator, { backgroundColor: tokens.colors.primary }]}
        />
      ) : null}
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        Profil keuangan & preferensi
      </Text>
      <Text
        style={[tokens.typography.bodyLarge, styles.lead, { color: tokens.colors.textSecondary }]}
      >
        Default fixture selalu dapat diedit sebelum disimpan.
      </Text>
      <StepIndicator step={step} />
      {validationError ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.bodyLarge, styles.error, { color: tokens.colors.danger }]}
        >
          {validationError}
        </Text>
      ) : null}
      {step === 0 ? (
        <LocationStep
          preferences={preferences}
          renderedLocale={renderedLocale}
          renderedTimezone={renderedTimezone}
          onBack={onBack}
          onChange={updatePreferences}
          onNext={() => setStep(1)}
        />
      ) : null}
      {step === 1 ? (
        <CurrencyStep
          currencyChanged={currencyChanged}
          pendingCurrency={pendingCurrency}
          preferences={preferences}
          preview={preview}
          onBack={goBack}
          onChange={updatePreferences}
          onConfirmCurrency={confirmCurrency}
          onCancelCurrency={() => setPendingCurrency(null)}
          onNext={() => setStep(2)}
          onSelectCurrency={selectCurrency}
        />
      ) : null}
      {step === 2 ? (
        <PrivacyStep
          preferences={preferences}
          onBack={goBack}
          onChange={updatePreferences}
          onSave={save}
        />
      ) : null}
    </ScrollView>
  );
}

function LocationStep({
  onBack,
  preferences,
  renderedLocale,
  renderedTimezone,
  onChange,
  onNext,
}: {
  onBack?: () => void;
  preferences: FinancialPreferences;
  renderedLocale: ReturnType<typeof resolveLocaleForRender>;
  renderedTimezone: ReturnType<typeof resolveTimezoneForRender>;
  onChange: (patch: Partial<FinancialPreferences>) => void;
  onNext: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Card padding="space5" style={styles.card}>
      <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
        Lokasi & waktu
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.sectionCopy,
          { color: tokens.colors.textSecondary },
        ]}
      >
        Pilih locale BCP 47 dan timezone IANA untuk preview periode lokal.
      </Text>
      <Text
        style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
      >
        Locale aktif: {renderedLocale.value}
        {renderedLocale.fallback ? ' (fallback tampilan)' : ''}
      </Text>
      {SUPPORTED_LOCALES.map((item) => (
        <OptionButton
          key={item.code}
          label={`${item.label} (${item.code})`}
          selected={preferences.locale === item.code}
          onPress={() => onChange({ locale: item.code })}
        />
      ))}
      <Text
        style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
      >
        Zona waktu aktif: {renderedTimezone.value ?? 'pilih ulang'}
      </Text>
      {renderedTimezone.value === null ? (
        <Text
          style={[tokens.typography.bodyLarge, styles.warning, { color: tokens.colors.warning }]}
        >
          Zona tersimpan tidak dikenali: {preferences.timezone}
        </Text>
      ) : null}
      {SUPPORTED_TIMEZONES.map((timezone) => (
        <OptionButton
          key={timezone}
          label={timezone}
          selected={preferences.timezone === timezone}
          onPress={() => onChange({ timezone })}
        />
      ))}
      {onBack ? <Button label="Kembali ke profil" variant="tertiary" onPress={onBack} /> : null}
      <Button label="Lanjut ke mata uang" onPress={onNext} style={styles.nextButton} />
    </Card>
  );
}

function CurrencyStep({
  currencyChanged,
  pendingCurrency,
  preferences,
  preview,
  onBack,
  onChange,
  onConfirmCurrency,
  onCancelCurrency,
  onNext,
  onSelectCurrency,
}: {
  currencyChanged: boolean;
  pendingCurrency: string | null;
  preferences: FinancialPreferences;
  preview: { amount: string; date: string };
  onBack: () => void;
  onChange: (patch: Partial<FinancialPreferences>) => void;
  onConfirmCurrency: () => void;
  onCancelCurrency: () => void;
  onNext: () => void;
  onSelectCurrency: (code: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <Card padding="space5" style={styles.card}>
      <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
        Mata uang & periode
      </Text>
      <Text
        style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
      >
        Mata uang dasar: {preferences.baseCurrency}
      </Text>
      {SUPPORTED_CURRENCIES.map((currency) => (
        <OptionButton
          key={currency.code}
          label={`${currency.code} — ${currency.label}`}
          selected={preferences.baseCurrency === currency.code}
          onPress={() => onSelectCurrency(currency.code)}
        />
      ))}
      {currencyChanged ? (
        <Text style={[tokens.typography.bodyLarge, styles.info, { color: tokens.colors.info }]}>
          Histori tetap menggunakan currency dan amount lama; perubahan hanya memengaruhi preferensi
          dan reporting fixture.
        </Text>
      ) : null}
      {pendingCurrency ? (
        <Card
          testID="currency-confirmation-dialog"
          padding="space4"
          variant="muted"
          style={styles.confirmation}
        >
          <Text
            accessibilityRole="alert"
            style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}
          >
            Konfirmasi perubahan mata uang
          </Text>
          <Text
            style={[
              tokens.typography.bodyLarge,
              styles.sectionCopy,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Transaksi historis tidak dikonversi permanen. Currency dan amount lama tetap identik.
          </Text>
          <View style={styles.actions}>
            <Button label="Konfirmasi ganti mata uang" onPress={onConfirmCurrency} />
            <Button label="Batal ganti mata uang" variant="tertiary" onPress={onCancelCurrency} />
          </View>
        </Card>
      ) : null}
      <Input
        label="Awal bulan finansial"
        required
        accessibilityLabel="Awal bulan finansial (wajib)"
        keyboardType="number-pad"
        value={String(preferences.financialMonthStart)}
        onChangeText={(value) => onChange({ financialMonthStart: Number(value) })}
        hint="Pilih angka 1–28"
        containerStyle={styles.input}
      />
      <Text
        style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
      >
        Awal minggu
      </Text>
      <OptionButton
        label="Senin (1)"
        selected={preferences.weekStartsOn === 1}
        onPress={() => onChange({ weekStartsOn: 1 })}
      />
      <OptionButton
        label="Minggu (7)"
        selected={preferences.weekStartsOn === 7}
        onPress={() => onChange({ weekStartsOn: 7 })}
      />
      <Text
        style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
      >
        Format tanggal
      </Text>
      {SUPPORTED_DATE_FORMATS.map((format) => (
        <OptionButton
          key={format}
          label={format}
          selected={preferences.dateFormat === format}
          onPress={() => onChange({ dateFormat: format })}
        />
      ))}
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.preview,
          { color: tokens.colors.textSecondary },
        ]}
      >
        Preview: {preview.amount} · {preview.date}
      </Text>
      <View style={styles.actions}>
        <Button label="Kembali ke lokasi" variant="tertiary" onPress={onBack} />
        <Button label="Lanjut ke privasi" onPress={onNext} />
      </View>
    </Card>
  );
}

function PrivacyStep({
  preferences,
  onBack,
  onChange,
  onSave,
}: {
  preferences: FinancialPreferences;
  onBack: () => void;
  onChange: (patch: Partial<FinancialPreferences>) => void;
  onSave: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Card padding="space5" style={styles.card}>
      <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
        Privasi & preferensi
      </Text>
      <Input
        label="Nama tampilan"
        required
        value={preferences.displayName}
        onChangeText={(displayName) => onChange({ displayName })}
        accessibilityLabel="Nama tampilan (wajib)"
        containerStyle={styles.input}
      />
      <Text
        style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
      >
        Kontrol lokal
      </Text>
      <SwitchControl
        label="Analytics anonim fixture"
        checked={preferences.analyticsEnabled}
        onPress={() => onChange({ analyticsEnabled: !preferences.analyticsEnabled })}
      />
      <SwitchControl
        label="Sembunyikan nominal lokal"
        checked={preferences.maskAmounts}
        onPress={() => onChange({ maskAmounts: !preferences.maskAmounts })}
      />
      <SwitchControl
        label="Sembunyikan preview app switcher"
        checked={preferences.hideInAppSwitcher}
        onPress={() => onChange({ hideInAppSwitcher: !preferences.hideInAppSwitcher })}
      />
      <SwitchControl
        label="Kunci lokal fixture"
        checked={preferences.biometricLock}
        onPress={() => onChange({ biometricLock: !preferences.biometricLock })}
      />
      <Text
        style={[tokens.typography.label, styles.groupLabel, { color: tokens.colors.textPrimary }]}
      >
        Tema
      </Text>
      {SUPPORTED_THEMES.map((theme) => (
        <OptionButton
          key={theme}
          label={theme === 'system' ? 'Sesuai sistem' : theme === 'light' ? 'Terang' : 'Gelap'}
          selected={preferences.theme === theme}
          onPress={() => onChange({ theme })}
        />
      ))}
      <SwitchControl
        label="Pengingat pencatatan"
        checked={preferences.reminderEnabled}
        onPress={() => onChange({ reminderEnabled: !preferences.reminderEnabled })}
      />
      <SwitchControl
        label="Ringkasan mingguan"
        checked={preferences.weeklySummaryEnabled}
        onPress={() => onChange({ weeklySummaryEnabled: !preferences.weeklySummaryEnabled })}
      />
      <SwitchControl
        label="Peringatan anggaran"
        checked={preferences.budgetAlertEnabled}
        onPress={() => onChange({ budgetAlertEnabled: !preferences.budgetAlertEnabled })}
      />
      <View style={styles.actions}>
        <Button label="Kembali ke periode" variant="tertiary" onPress={onBack} />
        <Button label="Simpan preferensi fixture" onPress={onSave} />
      </View>
    </Card>
  );
}

function StepIndicator({ step }: { step: number }) {
  const { tokens } = useTheme();
  return (
    <View
      accessibilityLabel={`Langkah ${step + 1} dari ${STEP_TITLES.length}`}
      style={styles.stepIndicator}
    >
      {STEP_TITLES.map((title, index) => (
        <Text
          key={title}
          style={[
            tokens.typography.caption,
            { color: index === step ? tokens.colors.primary : tokens.colors.textMuted },
          ]}
        >
          {index + 1}. {title}
        </Text>
      ))}
    </View>
  );
}

function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={[
        styles.option,
        {
          borderColor: selected ? tokens.colors.primary : tokens.colors.borderSubtle,
          backgroundColor: selected ? tokens.colors.primaryContainer : tokens.colors.surface,
        },
      ]}
    >
      <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SwitchControl({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.switch}
    >
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.switchLabel,
          { color: tokens.colors.textPrimary },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          tokens.typography.label,
          { color: checked ? tokens.colors.primary : tokens.colors.textSecondary },
        ]}
      >
        {checked ? 'Aktif' : 'Nonaktif'}
      </Text>
    </Pressable>
  );
}

function StatusState({
  accessibilityLabel,
  body,
  children,
  reducedMotion = false,
  status,
  title,
}: {
  accessibilityLabel?: string;
  body: string;
  children?: ReactNode;
  reducedMotion?: boolean;
  status?: 'loading' | 'progress';
  title: string;
}) {
  const { tokens } = useTheme();
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={status ? 'progressbar' : undefined}
      accessibilityState={status ? { busy: true } : undefined}
      style={[
        styles.statusState,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
    >
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      <Text
        style={[tokens.typography.bodyLarge, styles.lead, { color: tokens.colors.textSecondary }]}
      >
        {body}
      </Text>
      {reducedMotion ? (
        <View
          testID="financial-profile-status-reduced-motion"
          accessible={false}
          style={[styles.motionIndicator, { backgroundColor: tokens.colors.primary }]}
        />
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: FINANCIAL_PROFILE_LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  statusState: {
    flex: 1,
    justifyContent: 'center',
  },
  lead: {
    marginTop: 8,
  },
  card: {
    width: '100%',
  },
  sectionCopy: {
    marginTop: 8,
  },
  groupLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  option: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: FINANCIAL_PROFILE_LAYOUT.minimumTouchTarget,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  switch: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: FINANCIAL_PROFILE_LAYOUT.minimumTouchTarget,
    marginTop: 8,
  },
  switchLabel: {
    flex: 1,
  },
  input: {
    marginTop: 16,
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  nextButton: {
    marginTop: 20,
  },
  confirmation: {
    marginTop: 16,
  },
  conflictCard: {
    marginTop: 16,
    gap: 8,
  },
  preview: {
    marginTop: 16,
  },
  info: {
    marginTop: 12,
  },
  warning: {
    marginBottom: 4,
  },
  error: {
    marginTop: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  motionIndicator: {
    borderRadius: 99,
    height: 8,
    marginBottom: 12,
    width: 8,
  },
});
