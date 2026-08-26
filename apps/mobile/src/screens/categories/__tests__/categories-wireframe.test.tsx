import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import {
  CATEGORY_LAYOUT,
  DEFAULT_CATEGORY_FIXTURES,
  DEFAULT_RULE_FIXTURES,
  DEFAULT_TAG_FIXTURES,
  RULE_OPERATORS,
  SUPPORTED_CATEGORY_KINDS,
  TAG_COLOR_TOKENS,
  createCategoriesFixture,
  evaluateClassificationRules,
  normalizeLabel,
  previewClassificationRule,
  validateCategoryDraft,
  validateRuleDraft,
  validateTagDraft,
  type CategoriesScenario,
  type ClassificationRule,
} from '../categories-fixture';
import { CategoriesWireframe } from '../categories-wireframe';

function renderCategories(scenario?: CategoriesScenario, options?: { reducedMotion?: boolean }) {
  return render(
    <ThemeProvider reducedMotion={options?.reducedMotion}>
      <CategoriesWireframe fixture={createCategoriesFixture(scenario)} />
    </ThemeProvider>,
  );
}

describe('U05 F04 categories, tags, and classification rules wireframe', () => {
  beforeEach(() => {
    defaultSessionAdapter.reset();
  });

  it('exposes supported taxonomy, limits, route readiness, and no duplicate fixture ids', () => {
    expect(SUPPORTED_CATEGORY_KINDS).toEqual(['expense', 'income', 'transfer']);
    expect(RULE_OPERATORS).toEqual([
      'equals',
      'contains',
      'starts_with',
      'in',
      'gte',
      'lte',
      'weekday_in',
    ]);
    expect(TAG_COLOR_TOKENS.length).toBeGreaterThanOrEqual(4);
    expect(CATEGORY_LAYOUT).toMatchObject({
      minimumWidth: 320,
      minimumTouchTarget: 48,
    });
    expect(DEFAULT_CATEGORY_FIXTURES.length).toBeGreaterThan(1);
    expect(new Set(DEFAULT_CATEGORY_FIXTURES.map((item) => item.id)).size).toBe(
      DEFAULT_CATEGORY_FIXTURES.length,
    );
    expect(new Set(DEFAULT_TAG_FIXTURES.map((item) => item.id)).size).toBe(
      DEFAULT_TAG_FIXTURES.length,
    );
    expect(new Set(DEFAULT_RULE_FIXTURES.map((item) => item.id)).size).toBe(
      DEFAULT_RULE_FIXTURES.length,
    );
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F04')).toMatchObject({
      routeId: 'categories',
      path: '/categories',
      navigationGroup: 'transactions',
      readiness: 'WIREFRAME READY',
    });
  });

  it('normalizes labels safely and validates category hierarchy boundaries', () => {
    expect(normalizeLabel('  Café\u00a0  ')).toBe('café');
    expect(normalizeLabel('שלום  עולם')).toBe('שלום עולם');
    expect(validateCategoryDraft({ name: '  Makan  ', kind: 'expense' })).toEqual({
      ok: true,
      value: expect.objectContaining({ name: 'Makan', normalizedName: 'makan' }),
    });
    expect(validateCategoryDraft({ name: '', kind: 'expense' }).ok).toBe(false);
    expect(validateCategoryDraft({ name: 'A'.repeat(41), kind: 'expense' }).ok).toBe(false);
    expect(
      validateCategoryDraft({
        name: 'Child',
        kind: 'expense',
        parentId: 'category-food',
        existing: DEFAULT_CATEGORY_FIXTURES,
      }).ok,
    ).toBe(true);
    expect(
      validateCategoryDraft({
        name: 'Cycle',
        kind: 'expense',
        parentId: 'category-food-child',
        existing: DEFAULT_CATEGORY_FIXTURES,
        editingId: 'category-food',
      }).message,
    ).toMatch(/cycle|parent|level/i);
  });

  it('validates normalized tag duplicates and token colors', () => {
    const duplicate = validateTagDraft({
      name: '  Grocery  ',
      colorToken: TAG_COLOR_TOKENS[0],
      existing: DEFAULT_TAG_FIXTURES,
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.message).toMatch(/sudah ada|duplicate/i);
    expect(validateTagDraft({ name: 'New tag', colorToken: TAG_COLOR_TOKENS[1] }).ok).toBe(true);
    expect(validateTagDraft({ name: 'A'.repeat(31), colorToken: TAG_COLOR_TOKENS[1] }).ok).toBe(
      false,
    );
    expect(validateTagDraft({ name: 'Valid', colorToken: 'user-red' }).ok).toBe(false);
  });

  it('enforces rule condition/action limits and integer money boundaries', () => {
    expect(
      validateRuleDraft({
        name: 'Grocery',
        note: '',
        priority: 10,
        conditions: [
          { field: 'amountMinor', operator: 'gte', value: { minor: '100000', currency: 'IDR' } },
        ],
        actions: { categoryId: 'category-food', tagIds: ['tag-grocery'] },
      }).ok,
    ).toBe(true);
    expect(
      validateRuleDraft({
        name: 'Bad operator',
        note: '',
        priority: 10,
        conditions: [{ field: 'merchant', operator: 'regex', value: '.*' }],
        actions: { tagIds: ['tag-grocery'] },
      }).ok,
    ).toBe(false);
    expect(
      validateRuleDraft({
        name: 'No condition',
        note: '',
        priority: 10,
        conditions: [],
        actions: { tagIds: ['tag-grocery'] },
      }).ok,
    ).toBe(false);
    expect(
      validateRuleDraft({
        name: 'Too many conditions',
        note: '',
        priority: 10,
        conditions: Array.from({ length: 9 }, (_, index) => ({
          field: 'merchant' as const,
          operator: 'contains' as const,
          value: `merchant-${index}`,
        })),
        actions: { tagIds: ['tag-grocery'] },
      }).ok,
    ).toBe(false);
    expect(
      validateRuleDraft({
        name: 'Float money',
        note: '',
        priority: 10,
        conditions: [{ field: 'amountMinor', operator: 'gte', value: { minor: 1.5, currency: 'IDR' } }],
        actions: { tagIds: ['tag-grocery'] },
      }).ok,
    ).toBe(false);
  });

  it('evaluates priority DESC, specificity DESC, created_at ASC and unions tags', () => {
    const rules: ClassificationRule[] = [
      {
        ...DEFAULT_RULE_FIXTURES[0],
        id: 'low',
        priority: 1,
        specificity: 3,
        actions: { categoryId: 'category-food', tagIds: ['tag-grocery'] },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        ...DEFAULT_RULE_FIXTURES[0],
        id: 'high-specificity',
        priority: 5,
        specificity: 2,
        actions: { categoryId: 'category-coffee', tagIds: ['tag-grocery', 'tag-cafe'] },
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        ...DEFAULT_RULE_FIXTURES[0],
        id: 'same-priority-specificity-earlier',
        priority: 5,
        specificity: 2,
        actions: { tagIds: ['tag-cafe', 'tag-work'] },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const result = evaluateClassificationRules(rules, {
      merchant: 'Kopi Senja',
      amountMinor: '45000',
      currency: 'IDR',
    });
    expect(result.winnerId).toBe('same-priority-specificity-earlier');
    expect(result.categoryId).toBeUndefined();
    expect(result.tagIds).toEqual(['tag-cafe', 'tag-work']);
    expect(result.explanation).toMatch(/pemenang|priority|spesifik/i);
  });

  it('limits preview examples to twenty and includes labeled explanations', () => {
    const result = previewClassificationRule(DEFAULT_RULE_FIXTURES[0], {
      sampleSize: 35,
      merchant: 'Grocery Fixture',
      amountMinor: '125000',
      currency: 'IDR',
    });
    expect(result.hitCount).toBeGreaterThanOrEqual(0);
    expect(result.examples).toHaveLength(20);
    expect(result.examples[0]).toMatchObject({ merchant: expect.any(String) });
    expect(result.examples[0]?.explanation).toMatch(/Matched|Cocok|merchant|amount/i);
    expect(JSON.stringify(result)).not.toContain('rawJson');
  });

  it('supports archive/restore, online-required merge, conflict review, and newer-schema read-only', async () => {
    const fixture = createCategoriesFixture({ mergeOnline: false });
    expect(await fixture.archiveCategory('category-food')).toMatchObject({ kind: 'archived' });
    expect(fixture.snapshot().categories.find((item) => item.id === 'category-food')?.archived).toBe(
      true,
    );
    expect(await fixture.restoreCategory('category-food')?.then((item) => item?.archived)).toBe(false);
    expect(await fixture.merge({ sourceId: 'category-food-child', targetId: 'category-food' })).toEqual({
      kind: 'online_required',
    });
    expect(await createCategoriesFixture({ mergeOnline: true }).merge({
      sourceId: 'category-food-child',
      targetId: 'category-food',
      confirm: true,
    })).toMatchObject({ kind: 'merged', archivedSourceId: 'category-food-child' });
    expect(await createCategoriesFixture({ scenario: 'conflict' }).reviewConflict()).toMatchObject({
      kind: 'review',
    });
    expect(await createCategoriesFixture({ scenario: 'newer_schema' }).load()).toMatchObject({
      kind: 'read_only',
    });
  });

  it('renders list, tag, rule, preview, merge, retry, and state actions without dead buttons', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    renderCategories();
    expect(await screen.findByText('Kategori, tag & aturan')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Tambah kategori' }));
    expect(await screen.findByText('Kategori baru (fixture)')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Nama kategori'), 'Transport');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan kategori fixture' }));
    expect(await screen.findByText('Kategori tersimpan (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Tag' }));
    fireEvent.press(screen.getByRole('button', { name: 'Tambah tag' }));
    fireEvent.changeText(screen.getByLabelText('Nama tag'), 'Weekend');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan tag fixture' }));
    expect(await screen.findByText('Tag tersimpan (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Aturan' }));
    fireEvent.press(screen.getByRole('button', { name: 'Uji preview fixture' }));
    expect(await screen.findByText(/Preview aturan|Hasil preview/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Muat ulang fixture' }));
    expect(await screen.findByText(/Kategori tersimpan|Data siap/i)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows offline, error retry, empty custom, syncing, and conflict states', async () => {
    renderCategories('offline');
    expect(await screen.findByText(/offline/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi fixture' }));

    renderCategories('empty_custom');
    expect(await screen.findByText(/Belum ada kategori custom/i)).toBeTruthy();

    renderCategories('syncing');
    expect(await screen.findByText(/Sinkronisasi fixture/i)).toBeTruthy();

    renderCategories('error');
    expect(await screen.findByText(/Kategori gagal dimuat/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi fixture' }));

    renderCategories('conflict');
    expect(await screen.findByText(/Konflik fixture/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Tinjau konflik fixture' }));
    expect(await screen.findByText(/Tinjau perubahan fixture/i)).toBeTruthy();
  });

  it('connects Profile navigation and preserves back, accessibility, reduced motion, and 320dp constraints', async () => {
    renderCategories(undefined, { reducedMotion: true });
    expect(await screen.findByTestId('categories-scroll')).toBeTruthy();
    expect(screen.getByTestId('categories-reduced-motion-indicator')).toBeTruthy();
    expect(screen.getAllByRole('button')[0]?.props.accessibilityLabel).toBeTruthy();
    expect(CATEGORY_LAYOUT.minimumWidth).toBe(320);
    expect(CATEGORY_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);

    const onBack = jest.fn();
    render(
      <ThemeProvider>
        <CategoriesWireframe fixture={createCategoriesFixture()} onBack={onBack} />
      </ThemeProvider>,
    );
    fireEvent.press(await screen.findByRole('button', { name: 'Kembali' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/profile' });
    fireEvent.press(await routerScreen.findByRole('button', { name: 'Open categories' }));
    await waitFor(() => expect(routerScreen.getByText('Kategori, tag & aturan')).toBeTruthy());
  }, 15_000);
});
