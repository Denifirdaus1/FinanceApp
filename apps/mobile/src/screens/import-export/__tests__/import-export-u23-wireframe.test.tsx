import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { ImportExportWireframe } from '../import-export-wireframe';
import {
  createImportExportFixture,
  parseImportAmount,
  type ImportExportScenario,
} from '../import-export-fixture';

jest.setTimeout(30000);

describe('U23 F20 import, export, and portable backup wireframe', () => {
  it('connects the authenticated profile route and F20 manifest', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F20')).toMatchObject({
      routeId: 'import-export',
      path: '/profile/import-export',
      navigationGroup: 'profile',
      tab: 'profile',
      readiness: 'WIREFRAME READY',
    });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/profile/import-export' });
    expect(await routerScreen.findByText('Impor, ekspor & backup (fixture)')).toBeTruthy();
  });

  it('builds safe versioned CSV and JSON export previews', () => {
    const fixture = createImportExportFixture('ready');
    expect(fixture.exportPreview({ format: 'json', includeAttachments: false })).toMatchObject({
      format: 'json',
      schemaVersion: expect.any(String),
      includesSensitiveSecrets: false,
      includesUnauthorizedData: false,
      checksum: expect.any(String),
    });
    expect(fixture.exportPreview({ format: 'csv', includeAttachments: false })).toMatchObject({
      format: 'csv',
      encoding: 'UTF-8',
      rawAndDisplaySeparated: true,
    });
    expect(
      JSON.stringify(fixture.exportPreview({ format: 'json', includeAttachments: true })),
    ).not.toMatch(/token|oauth|service.?key|security.?log|deleted.?other/i);
  });

  it('guards attachment export with re-auth, password, encryption, TTL, and quota', () => {
    const fixture = createImportExportFixture('ready');
    expect(fixture.attachmentExport({ includeAttachments: true, reauthed: false })).toMatchObject({
      kind: 'reauth_required',
    });
    expect(
      fixture.attachmentExport({
        includeAttachments: true,
        reauthed: true,
        passwordProvided: true,
      }),
    ).toMatchObject({ kind: 'encrypted_fixture', ttlEnforced: true, quotaEnforced: true });
  });

  it.each([
    ['utf8_bom', 'UTF-8', 'comma'],
    ['semicolon_id', 'UTF-8', 'semicolon'],
    ['tab_us', 'UTF-8', 'tab'],
    ['corrupt', 'unknown', 'unknown'],
  ] as [ImportExportScenario, string, string][])(
    'inspects %s file profile safely',
    (scenario, encoding, delimiter) => {
      expect(createImportExportFixture(scenario).inspectFile()).toMatchObject({
        encoding,
        delimiter,
      });
    },
  );

  it('parses locale amounts exactly and escapes formula cells as text', () => {
    expect(parseImportAmount('1.250.000', 'id-ID')).toEqual({
      minor: '125000000',
      currency: 'IDR',
    });
    expect(parseImportAmount('1,250.00', 'en-US')).toEqual({ minor: '125000', currency: 'USD' });
    expect(parseImportAmount('1,5', 'id-ID')).toMatchObject({ kind: 'ambiguous' });
    const fixture = createImportExportFixture('ready');
    expect(fixture.formulaCell('=HYPERLINK("x")')).toMatchObject({
      escaped: true,
      treatedAsText: true,
    });
  });

  it('maps columns and previews valid/error rows with safe reasons', () => {
    const fixture = createImportExportFixture('ready');
    expect(
      fixture.mapColumns({ date: 'Tanggal', amount: 'Jumlah', currency: 'Mata Uang' }),
    ).toMatchObject({
      kind: 'mapped',
      requiredComplete: true,
    });
    expect(fixture.previewRows()).toMatchObject({
      validCount: 2,
      errorCount: 3,
      reasonsVisible: true,
    });
    expect(JSON.stringify(fixture.previewRows())).not.toMatch(
      /merchant|note|account.?id|transaction.?id/i,
    );
  });

  it('requires review for duplicates, invalid transfers, and missing required fields', () => {
    const fixture = createImportExportFixture('duplicates');
    expect(fixture.duplicatePolicy('review')).toMatchObject({
      requiresReview: true,
      autoDelete: false,
    });
    expect(fixture.dryRun()).toMatchObject({ kind: 'review_required', duplicateCount: 2 });
    expect(createImportExportFixture('invalid').dryRun()).toMatchObject({ kind: 'invalid_rows' });
  });

  it('supports bounded idempotent import progress, resume, rollback, and reconciliation', () => {
    const fixture = createImportExportFixture('partial_failure');
    expect(fixture.confirmImport()).toMatchObject({ kind: 'started', importJobIdPresent: true });
    expect(fixture.progress()).toMatchObject({
      committedCount: 4,
      rejectedCount: 2,
      resumable: true,
    });
    expect(fixture.retry('same-mutation')).toMatchObject({ kind: 'resumed', idempotent: true });
    expect(fixture.undo()).toMatchObject({ kind: 'undo_preview', persistence: false });
    expect(fixture.reconciliation()).toMatchObject({ committedCount: 4, rejectedCount: 2 });
  });

  it('keeps cancel/expiry/offline/kill-switch and privacy deletion handoff safe', () => {
    expect(createImportExportFixture('ready').cancel()).toMatchObject({
      localPurged: true,
      serverResult: null,
    });
    expect(createImportExportFixture('offline').offlineState()).toMatchObject({
      localPreview: true,
      commitBlocked: true,
    });
    expect(createImportExportFixture('expired').expiry()).toMatchObject({
      cleaned: true,
      shareAvailable: false,
    });
    expect(createImportExportFixture('kill_switch').killSwitch()).toMatchObject({
      importDisabled: true,
      coreExportAvailable: true,
    });
    expect(createImportExportFixture('ready').privacyDeletionHandoff()).toMatchObject({
      route: '/profile',
      safe: true,
    });
  });

  it('renders accessible controls and every visible action produces a fixture result', () => {
    render(
      <ThemeProvider reducedMotion>
        <ImportExportWireframe fixture={createImportExportFixture('ready')} />
      </ThemeProvider>,
    );
    for (const label of [
      'Pilih export',
      'Preview JSON',
      'Preview CSV',
      'Simpan preview export',
      'Pilih file import',
      'Deteksi format file',
      'Tampilkan preview import',
      'Mulai dry-run',
      'Konfirmasi import',
      'Batalkan operasi',
      'Buka privacy handoff',
    ]) {
      fireEvent.press(screen.getByRole('button', { name: label }));
    }
    expect(screen.getByText(/320dp/)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('does not use network, persistence, logging, or sensitive navigation data', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const fixture = createImportExportFixture('ready');
    render(
      <ThemeProvider>
        <ImportExportWireframe fixture={fixture} />
      </ThemeProvider>,
    );
    expect(fixture.diagnosticMetadata()).toMatchObject({
      payloadIncluded: false,
      networkCalled: false,
    });
    expect(JSON.stringify(fixture.safeRoute('preview'))).not.toMatch(
      /amount|filename|content|job.?id|token/i,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('covers attachment outcomes, incomplete mapping, plain cells, and every recovery scenario', () => {
    const fixture = createImportExportFixture('ready');
    expect(fixture.attachmentExport({ includeAttachments: false, reauthed: false })).toMatchObject({
      kind: 'not_requested',
    });
    expect(fixture.attachmentExport({ includeAttachments: true, reauthed: true })).toMatchObject({
      kind: 'password_required',
    });
    expect(fixture.mapColumns({ date: 'Tanggal' })).toMatchObject({
      kind: 'incomplete',
      requiredComplete: false,
    });
    expect(fixture.formulaCell(' plain ')).toMatchObject({ escaped: false, treatedAsText: false });
    expect(parseImportAmount('', 'id-ID')).toMatchObject({ kind: 'invalid', reason: 'empty' });
    expect(parseImportAmount('1.234,567', 'id-ID')).toMatchObject({
      kind: 'invalid',
      reason: 'format',
    });
    expect(parseImportAmount('1,234', 'en-US')).toEqual({ minor: '123400', currency: 'USD' });
    expect(fixture.duplicatePolicy('skip')).toMatchObject({
      requiresReview: false,
      autoDelete: false,
    });
    expect(fixture.dryRun()).toMatchObject({ kind: 'ready_to_confirm' });
    expect(createImportExportFixture('offline').confirmImport()).toMatchObject({
      kind: 'offline_blocked',
    });
    expect(createImportExportFixture('ready').expiry()).toMatchObject({ shareAvailable: true });
    expect(createImportExportFixture('kill_switch').killSwitch()).toMatchObject({
      importDisabled: true,
    });
  });

  it('covers optional back callback and all visible export/import actions', () => {
    const onBack = jest.fn();
    render(
      <ThemeProvider>
        <ImportExportWireframe
          fixture={createImportExportFixture('partial_failure')}
          onBack={onBack}
        />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Kembali dari import export' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole('button', { name: 'Sertakan attachment archive' }));
    fireEvent.press(screen.getByRole('button', { name: 'Preview CSV' }));
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi re-auth attachment' }));
    fireEvent.press(screen.getByRole('button', { name: 'Masukkan password fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Preview safe share/download' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan preview export' }));
    fireEvent.press(screen.getByRole('button', { name: 'Batal export' }));
    fireEvent.press(screen.getByRole('button', { name: 'Deteksi format file' }));
    fireEvent.press(screen.getByRole('button', { name: 'Tampilkan preview import' }));
    fireEvent.press(screen.getByRole('button', { name: 'Mulai dry-run' }));
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi import' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lanjutkan batch fixture' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
