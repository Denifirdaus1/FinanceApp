import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  REVIEW_LAYOUT,
  createSearchReviewFixture,
  type SearchScenario,
  type SearchFilters,
} from './search-review-reconciliation-fixture';

type WireframeTab = 'search' | 'review' | 'reconciliation';

export interface SearchReviewReconciliationWireframeProps {
  fixture?: ReturnType<typeof createSearchReviewFixture>;
  onBack?: () => void;
}

function scenarioCopy(scenario: SearchScenario): string {
  const copies: Record<SearchScenario, string> = {
    ready: 'Pencarian lokal siap; query sensitif tetap di perangkat.',
    empty: 'Belum ada data lokal untuk dicari.',
    no_result: 'Tidak ada hasil pada cakupan lokal ini.',
    partial: 'Cakupan lokal sebagian; beberapa hasil lama belum terindeks.',
    indexing: 'Indexing berlangsung; hasil lokal terbaru tetap tersedia.',
    source_changed: 'Sumber berubah; perbarui evidence sebelum resolve.',
    pending_race: 'Outbox race terdeteksi; bulk resolve ditahan untuk review.',
    offline: 'Offline: search, review, dan draft reconciliation tetap aktif.',
    unauthorized: 'Tidak berwenang melihat scope ini.',
    corrupt_cursor: 'Cursor tidak valid; mulai ulang pagination secara aman.',
    reconciliation_stale: 'Rekonsiliasi stale; snapshot lama tetap dipertahankan.',
  };
  return copies[scenario];
}

const FILTER_LABELS = [
  'Tanggal',
  'Nominal',
  'Jenis',
  'Status',
  'Akun',
  'Kategori',
  'Tag',
  'Mata uang',
  'Sumber',
  'Struk',
  'Catatan',
] as const;

export function SearchReviewReconciliationWireframe({
  fixture: suppliedFixture,
  onBack,
}: SearchReviewReconciliationWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createSearchReviewFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [tab, setTab] = useState<WireframeTab>('search');
  const [query, setQuery] = useState('');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [searchResult, setSearchResult] = useState<ReturnType<typeof fixture.search>>();

  const runSearch = () => {
    setSearchResult(fixture.search(query));
    setNotice('Hasil pencarian lokal diperbarui sebagai fixture.');
  };
  const applyFilter = (label: string) => {
    const filters: SearchFilters =
      label === 'Jenis' ? { entryType: 'expense' } : { entityTypes: ['transaction'] };
    fixture.search(query || 'kedai', filters);
    setNotice(`Filter ${label.toLocaleLowerCase('id-ID')} diterapkan atomically sebagai fixture.`);
  };
  const saveSearch = () => {
    const result = fixture.saveSearch({
      name: 'Pencarian fixture',
      query: query || 'kedai',
      filters: {},
    });
    setNotice(
      result.kind === 'saved_fixture'
        ? 'Pencarian tersimpan untuk sesi ini.'
        : 'Nama pencarian tidak valid.',
    );
  };

  return (
    <ScrollView
      accessibilityLabel="Search review reconciliation fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Search, Review &amp; Reconciliation (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Temukan record, tinjau pointer, dan cocokkan statement tanpa mengubah sumber kanonis.
          </Text>
        </View>
        <Button
          label={privacyMode ? 'Nominal disembunyikan' : 'Sembunyikan nominal'}
          variant="secondary"
          onPress={() => setPrivacyMode((value) => !value)}
          style={styles.headerAction}
        />
      </View>

      <Card variant="muted" style={styles.statusCard} accessibilityLabel="Status F16 fixture">
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          {scenarioCopy(fixture.scenario)}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Local-only · snapshot fixture · business date aman ·{' '}
          {reducedMotion ? 'Animasi dikurangi' : 'Animasi aman'} · tidak ada data sensitif di
          URL/log.
        </Text>
        {fixture.scenario === 'corrupt_cursor' || fixture.scenario === 'source_changed' ? (
          <Button
            label="Muat ulang fixture"
            variant="secondary"
            onPress={() =>
              setNotice(
                fixture.retry().kind === 'restarted'
                  ? 'Pagination dimulai ulang.'
                  : 'Evidence perlu dimuat ulang.',
              )
            }
            style={styles.actionButton}
          />
        ) : null}
      </Card>

      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}

      <View style={styles.wrapRow}>
        <Button
          label="Search"
          variant={tab === 'search' ? 'primary' : 'secondary'}
          onPress={() => setTab('search')}
          style={styles.actionButton}
        />
        <Button
          label="Review inbox"
          variant={tab === 'review' ? 'primary' : 'secondary'}
          onPress={() => setTab('review')}
          style={styles.actionButton}
        />
        <Button
          label="Rekonsiliasi"
          variant={tab === 'reconciliation' ? 'primary' : 'secondary'}
          onPress={() => setTab('reconciliation')}
          style={styles.actionButton}
        />
      </View>

      {tab === 'search' ? (
        <Card accessibilityLabel="Search local fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Pencarian lokal (fixture)
          </Text>
          <Input
            label="Cari lokal"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Cari lokal"
          />
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            NFKC, lowercase, diacritic folding, phrase/prefix, ranking deterministik. Minimal 2
            karakter.
          </Text>
          <Button label="Cari fixture" onPress={runSearch} style={styles.actionButton} />
          <View style={styles.wrapRow}>
            {FILTER_LABELS.map((label) => (
              <Button
                key={label}
                label={`Filter ${label}`}
                variant="secondary"
                onPress={() => applyFilter(label)}
                style={styles.smallButton}
              />
            ))}
          </View>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Filter aktif: fixture ·
            account/type/status/currency/category/tag/source/receipt/note/date/amount.
          </Text>
          {fixture.scenario === 'empty' ? (
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Belum ada data lokal.
            </Text>
          ) : null}
          {searchResult?.kind === 'no_result' || fixture.scenario === 'no_result' ? (
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Tidak ada hasil.
            </Text>
          ) : null}
          {searchResult?.kind === 'partial_coverage' ? (
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Cakupan lokal sebagian; cari data lama ditunda sampai boundary aman.
            </Text>
          ) : null}
          {searchResult?.indexing || fixture.scenario === 'indexing' ? (
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Indexing: hasil recent tetap dapat ditinjau.
            </Text>
          ) : null}
          {searchResult?.results.length ? (
            <Card
              variant="raised"
              accessibilityLabel="Hasil lokal fixture"
              style={styles.resultCard}
            >
              <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
                Hasil lokal fixture
              </Text>
              {searchResult.results.slice(0, 8).map((result) => (
                <View key={result.id} style={styles.resultRow}>
                  <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
                    {result.entityType}: {result.label}
                  </Text>
                  {result.amountMinor ? (
                    <SensitiveValue
                      value={`${result.currency} ${result.amountMinor}`}
                      hidden={privacyMode}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}
          <Button
            label="Simpan pencarian fixture"
            variant="secondary"
            onPress={saveSearch}
            style={styles.actionButton}
          />
          <Button
            label="Muat ulang fixture"
            variant="secondary"
            onPress={() =>
              setNotice(
                fixture.retry().kind === 'restarted'
                  ? 'Pagination dimulai ulang.'
                  : 'Index fixture disegarkan.',
              )
            }
            style={styles.actionButton}
          />
        </Card>
      ) : null}

      {tab === 'review' ? (
        <Card accessibilityLabel="Review inbox fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Review inbox (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Pointer dan reason terlihat; possible duplicate tidak pernah auto-merge/delete.
          </Text>
          {fixture.reviewItems().map((item) => (
            <Text
              key={item.id}
              style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}
            >
              {item.reason} · {item.severity} · evidence v{item.evidenceVersion}
            </Text>
          ))}
          <Button
            label="Pratinjau bulk resolve"
            onPress={() => {
              const result = fixture.bulkResolvePreview(['review-ocr', 'review-category']);
              setNotice(
                result.kind === 'blocked_race'
                  ? 'Bulk resolve ditahan karena outbox race.'
                  : 'Preview bulk resolve all-or-nothing siap; undo tersedia.',
              );
            }}
            style={styles.actionButton}
          />
          <Button
            label="Buka transaksi fixture"
            variant="secondary"
            onPress={() => setNotice('Detail transaksi fixture dibuka tanpa parameter sensitif.')}
            style={styles.actionButton}
          />
          <Button
            label="Kembali ke search"
            variant="secondary"
            onPress={() => {
              setTab('search');
              onBack?.();
            }}
            style={styles.actionButton}
          />
        </Card>
      ) : null}

      {tab === 'reconciliation' ? (
        <Card accessibilityLabel="Reconciliation fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Rekonsiliasi akun (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Opening, cutoff, closing, dan calculated closing memakai signed account lines yang
            posted + cleared/reconciled. Pending, draft, void excluded.
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Statement period fixture · currency akun sama · transfer direconcile per leg · finalize
            butuh difference 0 dan tanpa pending outbox.
          </Text>
          <SensitiveValue value="IDR 1.300.000" hidden={privacyMode} />
          <Button
            label="Buat adjustment fixture"
            onPress={() => {
              const result = fixture.adjustmentPreview('10000');
              setNotice(
                `${result.entryType} fixture dipreview; explicit confirmation diperlukan dan cashflow tetap excluded.`,
              );
            }}
            style={styles.actionButton}
          />
          <Button
            label="Finalisasi rekonsiliasi"
            variant="secondary"
            onPress={() =>
              setNotice(
                fixture.finalizeReconciliation().kind === 'offline_disabled'
                  ? 'Finalisasi disabled offline; draft tetap aman.'
                  : 'Rekonsiliasi difinalisasi sebagai fixture.',
              )
            }
            style={styles.actionButton}
          />
          <Button
            label="Buka transaksi fixture"
            variant="secondary"
            onPress={() => setNotice('Detail transaksi fixture dibuka tanpa parameter sensitif.')}
            style={styles.actionButton}
          />
          <Button
            label="Kembali ke search"
            variant="secondary"
            onPress={() => {
              setTab('search');
              onBack?.();
            }}
            style={styles.actionButton}
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: REVIEW_LAYOUT.maximumContentWidth,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 4 },
  headerAction: { minHeight: REVIEW_LAYOUT.minimumTouchTarget },
  statusCard: { gap: 8 },
  section: { gap: 12 },
  resultCard: { gap: 8 },
  resultRow: { gap: 4 },
  notice: { padding: 12 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { minHeight: REVIEW_LAYOUT.minimumTouchTarget },
  actionButton: { minHeight: REVIEW_LAYOUT.minimumTouchTarget },
});
