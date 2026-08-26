export const CATEGORY_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

export const FIXTURE_LIMITS = {
  categories: 100,
  tags: 200,
  rules: 100,
} as const;

export const SUPPORTED_CATEGORY_KINDS = ['expense', 'income', 'transfer'] as const;
export type CategoryKind = (typeof SUPPORTED_CATEGORY_KINDS)[number];

export const TAG_COLOR_TOKENS = ['mint', 'peach', 'lavender', 'sky', 'lemon'] as const;
export type TagColorToken = (typeof TAG_COLOR_TOKENS)[number];

export const RULE_OPERATORS = [
  'equals',
  'contains',
  'starts_with',
  'in',
  'gte',
  'lte',
  'weekday_in',
] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

export type FixtureState = 'local_only' | 'sync_pending' | 'synced' | 'conflict' | 'archived';

export interface Category {
  id: string;
  parentId?: string;
  name: string;
  normalizedName: string;
  kind: CategoryKind;
  system: boolean;
  archived: boolean;
  state: FixtureState;
}

export interface Tag {
  id: string;
  name: string;
  normalizedName: string;
  colorToken: TagColorToken;
  archived: boolean;
  state: FixtureState;
}

export interface AmountOperand {
  minor: string;
  currency: 'IDR' | 'USD' | 'JPY';
}

export type RuleField = 'merchant' | 'merchantNormalized' | 'amountMinor' | 'weekday';
export type RuleValue = string | string[] | AmountOperand;

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value: RuleValue;
}

export interface RuleAction {
  categoryId?: string;
  tagIds: string[];
}

export type RulePresentationState =
  'enabled' | 'disabled' | 'dependency_archived' | 'invalid_after_upgrade' | 'conflict';

export interface ClassificationRule {
  id: string;
  name: string;
  note: string;
  priority: number;
  specificity: number;
  conditions: RuleCondition[];
  actions: RuleAction;
  state: RulePresentationState;
  createdAt: string;
}

export interface RuleDraftCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface CategoryDraft {
  name: string;
  kind: CategoryKind;
  parentId?: string;
  existing?: readonly Category[];
  editingId?: string;
}

export interface TagDraft {
  name: string;
  colorToken: string;
  existing?: readonly Tag[];
  editingId?: string;
}

export interface RuleDraft {
  name: string;
  note: string;
  priority: number;
  conditions: readonly RuleDraftCondition[];
  actions: RuleAction;
}

export type ValidationResult<T> =
  { ok: true; value: T; message?: undefined } | { ok: false; value?: undefined; message: string };

export function normalizeLabel(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

function categoryDepth(categories: readonly Category[], categoryId: string): number {
  let depth = 1;
  let current = categories.find((category) => category.id === categoryId);
  const visited = new Set<string>();
  while (current?.parentId) {
    if (visited.has(current.id)) return Number.POSITIVE_INFINITY;
    visited.add(current.id);
    depth += 1;
    current = categories.find((category) => category.id === current?.parentId);
  }
  return depth;
}

export function validateCategoryDraft(draft: CategoryDraft): ValidationResult<{
  name: string;
  normalizedName: string;
  kind: CategoryKind;
  parentId?: string;
}> {
  const name = draft.name.trim();
  const normalizedName = normalizeLabel(name);
  if (name.length < 1 || name.length > 40) {
    return { ok: false, message: 'Nama kategori harus 1–40 karakter.' };
  }
  if (!SUPPORTED_CATEGORY_KINDS.includes(draft.kind)) {
    return { ok: false, message: 'Jenis kategori tidak didukung.' };
  }
  const existing = draft.existing ?? [];
  if (
    existing.some(
      (category) =>
        !category.archived &&
        category.normalizedName === normalizedName &&
        category.id !== draft.editingId &&
        category.kind === draft.kind,
    )
  ) {
    return { ok: false, message: 'Kategori dengan nama ini sudah ada.' };
  }
  if (!draft.parentId) {
    return { ok: true, value: { name, normalizedName, kind: draft.kind } };
  }
  if (draft.parentId === draft.editingId) {
    return { ok: false, message: 'Kategori tidak boleh menjadi parent dirinya sendiri.' };
  }
  const parent = existing.find((category) => category.id === draft.parentId);
  if (!parent || parent.archived) {
    return { ok: false, message: 'Parent kategori tidak tersedia.' };
  }
  if (categoryDepth(existing, draft.parentId) >= 2) {
    return { ok: false, message: 'Hirarki kategori maksimal dua level.' };
  }
  if (draft.editingId) {
    let current: Category | undefined = parent;
    const visited = new Set<string>();
    while (current) {
      if (current.id === draft.editingId) {
        return { ok: false, message: 'Perubahan parent akan membuat cycle.' };
      }
      if (!current.parentId || visited.has(current.id)) break;
      visited.add(current.id);
      current = existing.find((category) => category.id === current?.parentId);
    }
  }
  return { ok: true, value: { name, normalizedName, kind: draft.kind, parentId: draft.parentId } };
}

export function validateTagDraft(draft: TagDraft): ValidationResult<{
  name: string;
  normalizedName: string;
  colorToken: TagColorToken;
}> {
  const name = draft.name.trim();
  const normalizedName = normalizeLabel(name);
  if (name.length < 1 || name.length > 30) {
    return { ok: false, message: 'Nama tag harus 1–30 karakter.' };
  }
  if (!TAG_COLOR_TOKENS.includes(draft.colorToken as TagColorToken)) {
    return { ok: false, message: 'Warna tag harus berasal dari token UI.' };
  }
  if (
    (draft.existing ?? []).some(
      (tag) => !tag.archived && tag.id !== draft.editingId && tag.normalizedName === normalizedName,
    )
  ) {
    return { ok: false, message: 'Tag dengan nama ini sudah ada.' };
  }
  return {
    ok: true,
    value: { name, normalizedName, colorToken: draft.colorToken as TagColorToken },
  };
}

function isAmountOperand(value: unknown): value is AmountOperand {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as AmountOperand).minor === 'string' &&
    /^-?\d+$/u.test((value as AmountOperand).minor) &&
    typeof (value as AmountOperand).currency === 'string' &&
    /^[A-Z]{3}$/u.test((value as AmountOperand).currency)
  );
}

function isSupportedCurrency(value: string): value is AmountOperand['currency'] {
  return value === 'IDR' || value === 'USD' || value === 'JPY';
}

export function validateRuleDraft(draft: RuleDraft): ValidationResult<ClassificationRule> {
  const name = draft.name.trim();
  const note = draft.note.trim();
  if (name.length < 1 || name.length > 80)
    return { ok: false, message: 'Nama aturan harus 1–80 karakter.' };
  if (note.length > 80) return { ok: false, message: 'Catatan aturan maksimal 80 karakter.' };
  if (!Number.isInteger(draft.priority))
    return { ok: false, message: 'Priority harus bilangan bulat.' };
  if (draft.conditions.length < 1 || draft.conditions.length > 8) {
    return { ok: false, message: 'Aturan harus memiliki 1–8 kondisi AND.' };
  }
  if (!draft.actions.categoryId && draft.actions.tagIds.length < 1) {
    return { ok: false, message: 'Aturan harus memiliki setidaknya satu action.' };
  }
  const conditions: RuleCondition[] = [];
  for (const condition of draft.conditions) {
    if (!RULE_OPERATORS.includes(condition.operator as RuleOperator)) {
      return { ok: false, message: 'Operator tidak diizinkan.' };
    }
    const operator = condition.operator as RuleOperator;
    const field = condition.field as RuleField;
    if (
      !['merchant', 'merchantNormalized', 'amountMinor', 'weekday'].includes(field) ||
      (operator === 'gte' || operator === 'lte') !== (field === 'amountMinor')
    ) {
      return { ok: false, message: 'Field dan operator tidak cocok.' };
    }
    if (field === 'amountMinor') {
      if (!isAmountOperand(condition.value) || !isSupportedCurrency(condition.value.currency)) {
        return { ok: false, message: 'Nominal harus berupa minor unit integer dan currency ISO.' };
      }
      conditions.push({ field, operator, value: condition.value });
      continue;
    }
    if (operator === 'weekday_in') {
      if (
        !Array.isArray(condition.value) ||
        condition.value.length < 1 ||
        condition.value.some((value) => !/^[1-7]$/u.test(String(value)))
      ) {
        return { ok: false, message: 'Hari harus berupa angka 1–7.' };
      }
      conditions.push({ field: 'weekday', operator, value: condition.value.map(String) });
      continue;
    }
    if (operator === 'in') {
      if (!Array.isArray(condition.value) || condition.value.length < 1) {
        return { ok: false, message: 'Operator in membutuhkan daftar nilai.' };
      }
      const values = condition.value.map(String);
      if (values.some((value) => value.length < 1 || value.length > 80)) {
        return { ok: false, message: 'Nilai kondisi merchant harus 1–80 karakter.' };
      }
      conditions.push({ field, operator, value: values });
      continue;
    }
    if (
      typeof condition.value !== 'string' ||
      condition.value.length < 2 ||
      condition.value.length > 80
    ) {
      return { ok: false, message: 'Teks merchant harus 2–80 karakter.' };
    }
    conditions.push({ field, operator, value: condition.value });
  }
  return {
    ok: true,
    value: {
      id: `rule-fixture-${name.toLowerCase().replace(/\W+/gu, '-')}`,
      name,
      note,
      priority: draft.priority,
      specificity: conditions.length,
      conditions,
      actions: { categoryId: draft.actions.categoryId, tagIds: [...new Set(draft.actions.tagIds)] },
      state: 'enabled',
      createdAt: '2026-08-26T00:00:00.000Z',
    },
  };
}

export const DEFAULT_CATEGORY_FIXTURES: Category[] = [
  {
    id: 'category-food',
    name: 'Makanan',
    normalizedName: 'makanan',
    kind: 'expense',
    system: true,
    archived: false,
    state: 'synced',
  },
  {
    id: 'category-food-child',
    parentId: 'category-food',
    name: 'Belanja bahan',
    normalizedName: 'belanja bahan',
    kind: 'expense',
    system: false,
    archived: false,
    state: 'synced',
  },
  {
    id: 'category-salary',
    name: 'Gaji',
    normalizedName: 'gaji',
    kind: 'income',
    system: true,
    archived: false,
    state: 'synced',
  },
  {
    id: 'category-transfer',
    name: 'Transfer internal',
    normalizedName: 'transfer internal',
    kind: 'transfer',
    system: true,
    archived: false,
    state: 'synced',
  },
];

export const DEFAULT_TAG_FIXTURES: Tag[] = [
  {
    id: 'tag-grocery',
    name: 'Grocery',
    normalizedName: 'grocery',
    colorToken: 'mint',
    archived: false,
    state: 'synced',
  },
  {
    id: 'tag-cafe',
    name: 'Cafe',
    normalizedName: 'cafe',
    colorToken: 'peach',
    archived: false,
    state: 'synced',
  },
  {
    id: 'tag-work',
    name: 'Work',
    normalizedName: 'work',
    colorToken: 'lavender',
    archived: false,
    state: 'synced',
  },
];

export const DEFAULT_RULE_FIXTURES: ClassificationRule[] = [
  {
    id: 'rule-grocery',
    name: 'Grocery otomatis',
    note: 'Fixture explainability',
    priority: 10,
    specificity: 1,
    conditions: [{ field: 'merchant', operator: 'contains', value: 'Kopi' }],
    actions: { categoryId: 'category-food', tagIds: ['tag-grocery'] },
    state: 'enabled',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rule-archived-dependency',
    name: 'Aturan dependency archived',
    note: '',
    priority: 8,
    specificity: 1,
    conditions: [{ field: 'merchant', operator: 'contains', value: 'Market' }],
    actions: { categoryId: 'category-food-child', tagIds: [] },
    state: 'dependency_archived',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'rule-upgrade',
    name: 'Aturan perlu update',
    note: '',
    priority: 5,
    specificity: 1,
    conditions: [{ field: 'merchant', operator: 'equals', value: 'Legacy' }],
    actions: { tagIds: ['tag-work'] },
    state: 'invalid_after_upgrade',
    createdAt: '2026-01-03T00:00:00.000Z',
  },
];

function sortRules(rules: readonly ClassificationRule[]): ClassificationRule[] {
  return [...rules].sort(
    (a, b) =>
      b.priority - a.priority ||
      b.specificity - a.specificity ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

function matchesCondition(condition: RuleCondition, sample: PreviewSample): boolean {
  if (condition.field === 'amountMinor') {
    if (!isAmountOperand(condition.value)) return false;
    if (sample.currency !== condition.value.currency) return false;
    const sampleMinor = BigInt(sample.amountMinor);
    const targetMinor = BigInt(condition.value.minor);
    return condition.operator === 'gte' ? sampleMinor >= targetMinor : sampleMinor <= targetMinor;
  }
  const raw = condition.field === 'weekday' ? String(sample.weekday ?? '') : sample.merchant;
  const normalized = raw.toLocaleLowerCase('en-US');
  if (condition.operator === 'weekday_in') {
    return Array.isArray(condition.value) && condition.value.includes(raw);
  }
  if (condition.operator === 'in') {
    return (
      Array.isArray(condition.value) &&
      condition.value.some((value) => value.toLocaleLowerCase('en-US') === normalized)
    );
  }
  if (typeof condition.value !== 'string') return false;
  const value = condition.value.toLocaleLowerCase('en-US');
  if (condition.operator === 'equals') return normalized === value;
  if (condition.operator === 'contains') return normalized.includes(value);
  if (condition.operator === 'starts_with') return normalized.startsWith(value);
  return false;
}

function ruleMatches(rule: ClassificationRule, sample: PreviewSample): boolean {
  return (
    rule.state === 'enabled' &&
    rule.conditions.every((condition) => matchesCondition(condition, sample))
  );
}

export interface PreviewSample {
  merchant: string;
  amountMinor: string;
  currency: AmountOperand['currency'];
  weekday?: string;
}

export function evaluateClassificationRules(
  rules: readonly ClassificationRule[],
  sample: PreviewSample,
): { winnerId?: string; categoryId?: string; tagIds: string[]; explanation: string } {
  const matches = sortRules(rules).filter((rule) => ruleMatches(rule, sample));
  const winner = matches[0];
  if (!winner) return { tagIds: [], explanation: 'Tidak ada rule yang cocok.' };
  return {
    winnerId: winner.id,
    categoryId: winner.actions.categoryId,
    tagIds: [...new Set(matches.flatMap((rule) => rule.actions.tagIds))],
    explanation: `Pemenang: ${winner.name}; priority ${winner.priority}; ${winner.conditions.length} kondisi cocok.`,
  };
}

export function previewClassificationRule(
  rule: ClassificationRule,
  sample: PreviewSample & { sampleSize?: number },
): { hitCount: number; examples: (PreviewSample & { explanation: string })[] } {
  const count = Math.min(20, Math.max(0, sample.sampleSize ?? 20));
  const examples = Array.from({ length: 20 }, (_, index) => {
    const example: PreviewSample = {
      merchant: index % 2 === 0 ? sample.merchant : `Fixture Merchant ${index + 1}`,
      amountMinor: sample.amountMinor,
      currency: sample.currency,
      weekday: sample.weekday ?? '1',
    };
    return {
      ...example,
      explanation: ruleMatches(rule, example)
        ? `Matched: ${rule.name}; merchant/amount conditions cocok.`
        : `Tidak cocok: ${rule.name}; kondisi AND belum terpenuhi.`,
    };
  });
  return { hitCount: count, examples };
}

export type CategoriesScenario =
  | 'offline'
  | 'syncing'
  | 'error'
  | 'empty_custom'
  | 'conflict'
  | 'newer_schema'
  | 'archive_blocked';

export type CategoriesFixtureOptions = {
  scenario?: CategoriesScenario;
  mergeOnline?: boolean;
};

export type CategoriesLoadResult =
  | { kind: 'ready'; categories: Category[]; tags: Tag[]; rules: ClassificationRule[] }
  | {
      kind:
        | 'offline'
        | 'syncing'
        | 'error'
        | 'empty_custom'
        | 'conflict'
        | 'archive_blocked'
        | 'read_only';
      categories: Category[];
      tags: Tag[];
      rules: ClassificationRule[];
    };

export type CategorySaveResult =
  { kind: 'saved'; category: Category } | { kind: 'validation_error'; message: string };

export type TagSaveResult =
  { kind: 'saved'; tag: Tag } | { kind: 'validation_error'; message: string };

export interface CategoriesFixture {
  load(): Promise<CategoriesLoadResult>;
  snapshot(): { categories: Category[]; tags: Tag[]; rules: ClassificationRule[] };
  createCategory(draft: CategoryDraft): Promise<CategorySaveResult>;
  archiveCategory(
    id: string,
  ): Promise<{ kind: 'archived' | 'dependency_blocked'; message?: string }>;
  restoreCategory(id: string): Promise<Category | undefined>;
  createTag(draft: TagDraft): Promise<TagSaveResult>;
  merge(input: {
    sourceId: string;
    targetId: string;
    confirm?: boolean;
  }): Promise<
    | { kind: 'online_required' }
    | { kind: 'cancelled' }
    | { kind: 'merged'; archivedSourceId: string }
  >;
  preview(ruleId: string): Promise<ReturnType<typeof previewClassificationRule>>;
  reviewConflict(): Promise<{ kind: 'review'; message: string }>;
}

export function createCategoriesFixture(
  input?: CategoriesScenario | CategoriesFixtureOptions,
): CategoriesFixture {
  const options: CategoriesFixtureOptions =
    typeof input === 'string' ? { scenario: input } : (input ?? {});
  let categories = DEFAULT_CATEGORY_FIXTURES.map((category) => ({ ...category }));
  let tags = DEFAULT_TAG_FIXTURES.map((tag) => ({ ...tag }));
  let rules = DEFAULT_RULE_FIXTURES.map((rule) => ({
    ...rule,
    actions: { ...rule.actions, tagIds: [...rule.actions.tagIds] },
  }));
  const online = options.mergeOnline ?? true;

  const load = async (): Promise<CategoriesLoadResult> => {
    const scenario = options.scenario;
    if (scenario === 'empty_custom') {
      return {
        kind: scenario,
        categories: categories.filter((item) => item.system),
        tags: [],
        rules: [],
      };
    }
    if (scenario === 'newer_schema') return { kind: 'read_only', categories, tags, rules };
    if (scenario) return { kind: scenario, categories, tags, rules };
    return { kind: 'ready', categories, tags, rules };
  };

  return {
    load,
    snapshot: () => ({
      categories: categories.map((item) => ({ ...item })),
      tags: tags.map((item) => ({ ...item })),
      rules: rules.map((item) => ({ ...item })),
    }),
    createCategory: async (draft) => {
      const validated = validateCategoryDraft({ ...draft, existing: categories });
      if (!validated.ok) return { kind: 'validation_error', message: validated.message };
      if (categories.filter((item) => !item.archived).length >= FIXTURE_LIMITS.categories) {
        return { kind: 'validation_error', message: 'Batas kategori fixture tercapai.' };
      }
      const category: Category = {
        id: `category-fixture-${categories.length + 1}`,
        ...validated.value,
        system: false,
        archived: false,
        state: 'local_only',
      };
      categories = [...categories, category];
      return { kind: 'saved', category };
    },
    archiveCategory: async (id) => {
      if (options.scenario === 'archive_blocked') {
        return { kind: 'dependency_blocked', message: 'Kategori masih dipakai oleh fixture.' };
      }
      categories = categories.map((category) =>
        category.id === id ? { ...category, archived: true, state: 'archived' } : category,
      );
      return { kind: 'archived' };
    },
    restoreCategory: async (id) => {
      let restored: Category | undefined;
      categories = categories.map((category) => {
        if (category.id !== id) return category;
        restored = { ...category, archived: false, state: 'sync_pending' };
        return restored;
      });
      return restored;
    },
    createTag: async (draft) => {
      const validated = validateTagDraft({ ...draft, existing: tags });
      if (!validated.ok) return { kind: 'validation_error', message: validated.message };
      if (tags.filter((item) => !item.archived).length >= FIXTURE_LIMITS.tags) {
        return { kind: 'validation_error', message: 'Batas tag fixture tercapai.' };
      }
      const tag: Tag = {
        id: `tag-fixture-${tags.length + 1}`,
        ...validated.value,
        archived: false,
        state: 'local_only',
      };
      tags = [...tags, tag];
      return { kind: 'saved', tag };
    },
    merge: async ({ sourceId, targetId, confirm }) => {
      if (!online) return { kind: 'online_required' };
      if (!confirm) return { kind: 'cancelled' };
      if (sourceId === targetId) return { kind: 'cancelled' };
      categories = categories.map((category) =>
        category.id === sourceId ? { ...category, archived: true, state: 'archived' } : category,
      );
      return { kind: 'merged', archivedSourceId: sourceId };
    },
    preview: async (ruleId) => {
      const rule =
        rules.find((item) => item.id === ruleId) ?? rules[0] ?? DEFAULT_RULE_FIXTURES[0]!;
      return previewClassificationRule(rule, {
        sampleSize: 20,
        merchant: 'Kopi Fixture',
        amountMinor: '45000',
        currency: 'IDR',
      });
    },
    reviewConflict: async () => ({
      kind: 'review',
      message: 'Tinjau perubahan fixture sebelum memilih versi.',
    }),
  };
}
