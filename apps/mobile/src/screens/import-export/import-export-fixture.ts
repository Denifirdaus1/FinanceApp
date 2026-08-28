export const IMPORT_EXPORT_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type ImportExportScenario =
  | 'ready'
  | 'utf8_bom'
  | 'semicolon_id'
  | 'tab_us'
  | 'corrupt'
  | 'duplicates'
  | 'invalid'
  | 'partial_failure'
  | 'offline'
  | 'expired'
  | 'kill_switch';

export type ExportFormat = 'csv' | 'json';

export interface ExportPreview {
  format: ExportFormat;
  schemaVersion: string;
  encoding: 'UTF-8';
  generatedAtBucket: 'fixture';
  locale: 'id-ID';
  timezone: 'Asia/Jakarta';
  currencyMetadata: 'included';
  checksum: string;
  rawAndDisplaySeparated: boolean;
  includesSensitiveSecrets: false;
  includesUnauthorizedData: false;
  includeAttachments: boolean;
  rowCountBucket: 'under_100';
}

export interface FileProfile {
  encoding: 'UTF-8' | 'unknown';
  delimiter: 'comma' | 'semicolon' | 'tab' | 'unknown';
  bom: boolean;
  format: 'csv' | 'unknown';
  sizeBucket: 'small' | 'oversize';
  contentSafe: boolean;
}

export type AmountResult =
  | { minor: string; currency: 'IDR' | 'USD' }
  | { kind: 'ambiguous'; options: string[] }
  | { kind: 'invalid'; reason: 'empty' | 'format' };

const PROFILE_BY_SCENARIO: Record<ImportExportScenario, FileProfile> = {
  ready: {
    encoding: 'UTF-8',
    delimiter: 'comma',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  utf8_bom: {
    encoding: 'UTF-8',
    delimiter: 'comma',
    bom: true,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  semicolon_id: {
    encoding: 'UTF-8',
    delimiter: 'semicolon',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  tab_us: {
    encoding: 'UTF-8',
    delimiter: 'tab',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  corrupt: {
    encoding: 'unknown',
    delimiter: 'unknown',
    bom: false,
    format: 'unknown',
    sizeBucket: 'small',
    contentSafe: false,
  },
  duplicates: {
    encoding: 'UTF-8',
    delimiter: 'comma',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  invalid: {
    encoding: 'UTF-8',
    delimiter: 'comma',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  partial_failure: {
    encoding: 'UTF-8',
    delimiter: 'comma',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  offline: {
    encoding: 'UTF-8',
    delimiter: 'comma',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  expired: {
    encoding: 'UTF-8',
    delimiter: 'comma',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
  kill_switch: {
    encoding: 'UTF-8',
    delimiter: 'comma',
    bom: false,
    format: 'csv',
    sizeBucket: 'small',
    contentSafe: true,
  },
};

function normalizeInteger(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return trimmed.replace(/^0+(?=\d)/, '') || '0';
}

export function parseImportAmount(value: string, locale: 'id-ID' | 'en-US'): AmountResult {
  const trimmed = value.trim();
  if (!trimmed) return { kind: 'invalid', reason: 'empty' };
  if (locale === 'id-ID') {
    if (/^\d+,\d{1,2}$/.test(trimmed)) {
      return { kind: 'ambiguous', options: ['decimal', 'thousands'] };
    }
    const [majorPart = '', decimalPart = ''] = trimmed.replace(/\./g, '').split(',');
    const major = normalizeInteger(majorPart);
    if (!major || !/^\d{0,2}$/.test(decimalPart)) return { kind: 'invalid', reason: 'format' };
    return { minor: `${major}${decimalPart.padEnd(2, '0')}`, currency: 'IDR' };
  }
  const [majorPart = '', decimalPart = ''] = trimmed.replace(/,/g, '').split('.');
  const major = normalizeInteger(majorPart);
  if (!major || !/^\d{0,2}$/.test(decimalPart)) return { kind: 'invalid', reason: 'format' };
  return { minor: `${major}${decimalPart.padEnd(2, '0')}`, currency: 'USD' };
}

function safeChecksum(format: ExportFormat, includeAttachments: boolean): string {
  return `${format === 'json' ? 'json' : 'csv'}-${includeAttachments ? 'attachment' : 'core'}-fixture`;
}

export function createImportExportFixture(scenario: ImportExportScenario = 'ready') {
  const isDuplicate = scenario === 'duplicates';
  const isInvalid = scenario === 'invalid';
  const isPartial = scenario === 'partial_failure';
  return {
    scenario,
    exportPreview(options: { format: ExportFormat; includeAttachments: boolean }): ExportPreview {
      return {
        format: options.format,
        schemaVersion: 'f20-fixture-v1',
        encoding: 'UTF-8',
        generatedAtBucket: 'fixture',
        locale: 'id-ID',
        timezone: 'Asia/Jakarta',
        currencyMetadata: 'included',
        checksum: safeChecksum(options.format, options.includeAttachments),
        rawAndDisplaySeparated: options.format === 'csv',
        includesSensitiveSecrets: false,
        includesUnauthorizedData: false,
        includeAttachments: options.includeAttachments,
        rowCountBucket: 'under_100',
      };
    },
    attachmentExport(options: {
      includeAttachments: boolean;
      reauthed: boolean;
      passwordProvided?: boolean;
    }) {
      if (!options.includeAttachments) return { kind: 'not_requested' as const };
      if (!options.reauthed) return { kind: 'reauth_required' as const };
      if (!options.passwordProvided) return { kind: 'password_required' as const };
      return {
        kind: 'encrypted_fixture' as const,
        ttlEnforced: true,
        quotaEnforced: true,
        expiryBucket: 'short' as const,
      };
    },
    inspectFile(): FileProfile {
      return { ...PROFILE_BY_SCENARIO[scenario] };
    },
    formulaCell(value: string) {
      const formula = /^[=+\-@]/.test(value.trim());
      return {
        escaped: formula,
        treatedAsText: formula,
        valueKind: formula ? ('text' as const) : ('plain' as const),
      };
    },
    mapColumns(mapping: Record<string, string>) {
      const required = ['date', 'amount', 'currency'];
      const requiredComplete = required.every((key) => mapping[key]?.trim());
      return requiredComplete
        ? {
            kind: 'mapped' as const,
            requiredComplete: true as const,
            columnCount: Object.keys(mapping).length,
          }
        : { kind: 'incomplete' as const, requiredComplete: false as const };
    },
    previewRows() {
      return {
        validCount: isInvalid ? 0 : 2,
        errorCount: isInvalid ? 5 : 3,
        reasonsVisible: true as const,
        errors: ['invalid_currency', 'ambiguous_date', 'missing_required'] as const,
        payloadIncluded: false as const,
      };
    },
    duplicatePolicy(policy: 'review' | 'skip' | 'create_new') {
      return {
        policy,
        requiresReview: isDuplicate && policy === 'review',
        autoDelete: false as const,
        fingerprintNormalized: true as const,
      };
    },
    dryRun() {
      if (isDuplicate)
        return { kind: 'review_required' as const, duplicateCount: 2, committedCount: 0 };
      if (isInvalid) return { kind: 'invalid_rows' as const, rejectedCount: 5, committedCount: 0 };
      return {
        kind: 'ready_to_confirm' as const,
        validCount: 2,
        rejectedCount: 0,
        committedCount: 0,
      };
    },
    confirmImport() {
      if (scenario === 'offline')
        return { kind: 'offline_blocked' as const, importJobIdPresent: false };
      return {
        kind: 'started' as const,
        importJobIdPresent: true as const,
        persistence: false as const,
      };
    },
    progress() {
      return isPartial
        ? {
            committedCount: 4,
            rejectedCount: 2,
            resumable: true as const,
            batchSizeBucket: 'small' as const,
          }
        : {
            committedCount: 2,
            rejectedCount: 0,
            resumable: true as const,
            batchSizeBucket: 'small' as const,
          };
    },
    retry(mutationKey: string) {
      return {
        kind: isPartial ? ('resumed' as const) : ('retried_fixture' as const),
        idempotent: Boolean(mutationKey),
        sameMutation: true as const,
      };
    },
    undo() {
      return {
        kind: 'undo_preview' as const,
        persistence: false as const,
        safeUntilReconciled: true as const,
      };
    },
    reconciliation() {
      const progress = this.progress();
      return {
        committedCount: progress.committedCount,
        rejectedCount: progress.rejectedCount,
        balanced: false,
        reviewRequired: isPartial,
      };
    },
    cancel() {
      return { localPurged: true as const, serverResult: null, attachmentResult: null };
    },
    offlineState() {
      return {
        localPreview: true as const,
        commitBlocked: scenario === 'offline',
        queued: scenario === 'offline',
      };
    },
    expiry() {
      return {
        cleaned: true as const,
        shareAvailable: scenario !== 'expired',
        ttlEnforced: true as const,
      };
    },
    killSwitch() {
      return {
        importDisabled: scenario === 'kill_switch',
        attachmentExportDisabled: scenario === 'kill_switch',
        coreExportAvailable: true as const,
      };
    },
    privacyDeletionHandoff() {
      return {
        route: '/profile' as const,
        safe: true as const,
        exportScope: 'authorized_data_only' as const,
      };
    },
    diagnosticMetadata() {
      return {
        payloadIncluded: false as const,
        networkCalled: false as const,
        codeBucket: 'fixture',
        timingBucket: 'short',
      };
    },
    safeRoute(target: 'preview' | 'profile') {
      return {
        route: target === 'profile' ? ('/profile' as const) : ('/profile/import-export' as const),
        containsSensitiveData: false as const,
      };
    },
  };
}

export type ImportExportFixture = ReturnType<typeof createImportExportFixture>;
