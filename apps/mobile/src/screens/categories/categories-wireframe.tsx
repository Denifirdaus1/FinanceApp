import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  CATEGORY_LAYOUT,
  DEFAULT_RULE_FIXTURES,
  RULE_OPERATORS,
  TAG_COLOR_TOKENS,
  createCategoriesFixture,
  type CategoriesFixture,
  type CategoriesLoadResult,
  type Category,
  type ClassificationRule,
  type Tag,
} from './categories-fixture';

type ScreenMode =
  | 'categories'
  | 'tags'
  | 'rules'
  | 'category-create'
  | 'tag-create'
  | 'preview'
  | 'merge'
  | 'archive-confirm'
  | 'status';

export interface CategoriesWireframeProps {
  fixture?: CategoriesFixture;
  onBack?: () => void;
}

function stateLabel(result: CategoriesLoadResult): string {
  switch (result.kind) {
    case 'offline':
      return 'Mode offline fixture';
    case 'syncing':
      return 'Data siap (fixture) · sinkronisasi pending';
    case 'empty_custom':
      return 'Data siap (fixture) · kategori custom kosong';
    case 'read_only':
      return 'Read-only: schema fixture lebih baru';
    default:
      return 'Data siap (fixture)';
  }
}

export function CategoriesWireframe({
  fixture = createCategoriesFixture(),
  onBack,
}: CategoriesWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [mode, setMode] = useState<ScreenMode>('categories');
  const [loadResult, setLoadResult] = useState<CategoriesLoadResult>();
  const [categoryName, setCategoryName] = useState('');
  const [tagName, setTagName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('category-food');
  const [selectedRuleId, setSelectedRuleId] = useState(
    DEFAULT_RULE_FIXTURES[0]?.id ?? 'rule-grocery',
  );

  const load = useCallback(() => {
    setLoadResult(undefined);
    void fixture.load().then(setLoadResult);
  }, [fixture]);

  useEffect(() => {
    let active = true;
    void fixture.load().then((result) => {
      if (active) setLoadResult(result);
    });
    return () => {
      active = false;
    };
  }, [fixture]);

  const goBack = () => {
    if (mode === 'categories' || mode === 'tags' || mode === 'rules') {
      onBack?.();
      return;
    }
    setMode('categories');
    setMessage('Kembali ke daftar fixture');
  };

  const saveCategory = async () => {
    const result = await fixture.createCategory({ name: categoryName, kind: 'expense' });
    setMessage(result.kind === 'saved' ? 'Kategori tersimpan (fixture)' : result.message);
    if (result.kind === 'saved') setMode('status');
  };

  const saveTag = async () => {
    const result = await fixture.createTag({ name: tagName, colorToken: TAG_COLOR_TOKENS[0] });
    setMessage(result.kind === 'saved' ? 'Tag tersimpan (fixture)' : result.message);
    if (result.kind === 'saved') setMode('status');
  };

  const archiveCategory = async () => {
    const result = await fixture.archiveCategory(selectedCategoryId);
    setMessage(
      result.kind === 'archived'
        ? 'Kategori diarsipkan (fixture)'
        : (result.message ?? 'Arsip diblokir fixture'),
    );
    setMode('status');
  };

  const confirmMerge = async (confirm: boolean) => {
    const result = await fixture.merge({
      sourceId: 'category-food-child',
      targetId: 'category-food',
      confirm,
    });
    const nextMessage =
      result.kind === 'online_required'
        ? 'Merge membutuhkan koneksi (fixture)'
        : result.kind === 'cancelled'
          ? 'Merge dibatalkan (fixture)'
          : 'Merge selesai; sumber diarsipkan (fixture)';
    setMessage(nextMessage);
    setMode('status');
  };

  const preview = async () => {
    await fixture.preview(selectedRuleId);
    setMessage('Hasil preview aturan (fixture): maksimal 20 contoh dengan penjelasan berlabel');
    setMode('preview');
  };

  if (!loadResult) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.colors.canvas }]}>
        <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
          Kategori, tag &amp; aturan
        </Text>
        <Button label="Memuat kategori" loading loadingLabel="Memuat kategori" />
      </View>
    );
  }

  if (loadResult.kind === 'error') {
    return (
      <View style={[styles.center, { backgroundColor: tokens.colors.canvas }]}>
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Kategori gagal dimuat
        </Text>
        <Button label="Coba lagi fixture" onPress={load} />
        <Button label="Kembali" variant="tertiary" onPress={goBack} />
      </View>
    );
  }

  const readOnly = loadResult.kind === 'read_only';

  return (
    <ScrollView
      testID="categories-scroll"
      contentContainerStyle={[styles.content, { backgroundColor: tokens.colors.canvas }]}
      style={{ backgroundColor: tokens.colors.canvas }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <Button label="Kembali" variant="tertiary" onPress={goBack} />
        <Text
          style={[tokens.typography.heading1, styles.title, { color: tokens.colors.textPrimary }]}
        >
          Kategori, tag &amp; aturan
        </Text>
      </View>
      {reducedMotion ? (
        <Text testID="categories-reduced-motion-indicator">Reduced motion aktif</Text>
      ) : null}
      <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
        {stateLabel(loadResult)}
      </Text>
      {loadResult.kind === 'offline' ? (
        <View>
          <Text style={[tokens.typography.body, { color: tokens.colors.warning }]}>
            Perubahan fixture dapat menunggu koneksi.
          </Text>
          <Button label="Coba lagi fixture" onPress={load} />
        </View>
      ) : null}
      {loadResult.kind === 'syncing' ? (
        <Text style={[tokens.typography.body, { color: tokens.colors.info }]}>
          Sinkronisasi fixture sedang berlangsung.
        </Text>
      ) : null}
      {loadResult.kind === 'conflict' ? (
        <Card padding="space4" variant="muted" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.warning }]}>
            Konflik fixture
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Perubahan parent, merge, conditions, dan actions perlu ditinjau.
          </Text>
          <Button
            label="Tinjau konflik fixture"
            onPress={() => {
              void fixture.reviewConflict().then((result) => {
                setMessage(result.message);
                setMode('status');
              });
            }}
          />
        </Card>
      ) : null}
      {readOnly ? (
        <Card padding="space4" variant="muted" style={styles.card}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Update aplikasi diperlukan untuk mengedit rule ini.
          </Text>
          <Button label="Lihat rule read-only" onPress={() => setMode('rules')} />
        </Card>
      ) : null}

      {mode === 'category-create' ? (
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Kategori baru (fixture)
          </Text>
          <Input label="Nama kategori" value={categoryName} onChangeText={setCategoryName} />
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Jenis: expense · parent opsional · maksimal dua level
          </Text>
          <Button label="Simpan kategori fixture" onPress={() => void saveCategory()} />
          <Button label="Batal kategori" variant="tertiary" onPress={() => setMode('categories')} />
        </Card>
      ) : null}

      {mode === 'tag-create' ? (
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Tag baru (fixture)
          </Text>
          <Input label="Nama tag" value={tagName} onChangeText={setTagName} />
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Warna token: {TAG_COLOR_TOKENS[0]}
          </Text>
          <Button label="Simpan tag fixture" onPress={() => void saveTag()} />
          <Button label="Batal tag" variant="tertiary" onPress={() => setMode('tags')} />
        </Card>
      ) : null}

      {mode === 'archive-confirm' ? (
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Konfirmasi arsip kategori
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Riwayat tidak dihapus. Kategori dapat dipulihkan jika fixture mengizinkan.
          </Text>
          <Button
            label="Konfirmasi arsip fixture"
            variant="destructive"
            onPress={() => void archiveCategory()}
          />
          <Button
            label="Batal arsip fixture"
            variant="tertiary"
            onPress={() => setMode('categories')}
          />
        </Card>
      ) : null}

      {mode === 'merge' ? (
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Review merge kategori
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Sumber: Belanja bahan → target: Makanan. Referensi fixture akan ditinjau sebelum
            konfirmasi.
          </Text>
          <Button label="Konfirmasi merge fixture" onPress={() => void confirmMerge(true)} />
          <Button
            label="Batalkan merge fixture"
            variant="tertiary"
            onPress={() => void confirmMerge(false)}
          />
        </Card>
      ) : null}

      {mode === 'preview' ? (
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Hasil preview aturan (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Matched explanation: maksimal 20 contoh, tanpa JSON mentah atau penyimpanan transaksi.
          </Text>
          <Button label="Uji preview fixture" onPress={() => void preview()} />
          <Button label="Muat ulang fixture" variant="secondary" onPress={load} />
          <Button label="Tutup preview" variant="tertiary" onPress={() => setMode('rules')} />
        </Card>
      ) : null}

      {mode === 'status' ? (
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.success }]}>
            {message}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Hasil ini deterministic dan hanya fixture lokal.
          </Text>
          <Button label="Kembali ke daftar" onPress={() => setMode('categories')} />
          <Button label="Muat ulang fixture" variant="tertiary" onPress={load} />
        </Card>
      ) : null}

      <View style={styles.tabs}>
        <Button label="Kategori" onPress={() => setMode('categories')} />
        <Button label="Tag" onPress={() => setMode('tags')} />
        <Button label="Aturan" onPress={() => setMode('rules')} />
      </View>

      {mode === 'categories' ? (
        <CategoryPanel
          categories={loadResult.categories}
          disabled={readOnly}
          onAdd={() => setMode('category-create')}
          onArchive={(id) => {
            setSelectedCategoryId(id);
            setMode('archive-confirm');
          }}
          onMerge={() => setMode('merge')}
        />
      ) : null}
      {mode === 'tags' ? (
        <TagPanel
          tags={loadResult.tags}
          disabled={readOnly}
          onAdd={() => setMode('tag-create')}
          onEditTag={(tag) => {
            setMessage(`Tag ${tag.name} siap diedit (fixture)`);
            setMode('status');
          }}
        />
      ) : null}
      {mode === 'rules' ? (
        <RulePanel
          rules={loadResult.rules}
          disabled={readOnly}
          onSelect={setSelectedRuleId}
          onPreview={() => void preview()}
        />
      ) : null}
    </ScrollView>
  );
}

function CategoryPanel({
  categories,
  disabled,
  onAdd,
  onArchive,
  onMerge,
}: {
  categories: Category[];
  disabled: boolean;
  onAdd: () => void;
  onArchive: (id: string) => void;
  onMerge: () => void;
}) {
  const { tokens } = useTheme();
  const custom = categories.filter((category) => !category.system && !category.archived);
  return (
    <View>
      <View style={styles.actionRow}>
        <Button label="Tambah kategori" disabled={disabled} onPress={onAdd} />
        <Button label="Review merge kategori" disabled={disabled} onPress={onMerge} />
      </View>
      {custom.length === 0 ? (
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Belum ada kategori custom
        </Text>
      ) : null}
      {categories
        .filter((category) => !category.archived)
        .map((category) => (
          <Card key={category.id} padding="space4" style={styles.card}>
            <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
              {category.name}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              {category.kind} · {category.system ? 'system' : 'custom'} ·{' '}
              {category.parentId ? 'child' : 'root'}
            </Text>
            <Button
              label={`Arsipkan ${category.name}`}
              disabled={disabled}
              variant="tertiary"
              onPress={() => onArchive(category.id)}
            />
          </Card>
        ))}
    </View>
  );
}

function TagPanel({
  tags,
  disabled,
  onAdd,
  onEditTag,
}: {
  tags: Tag[];
  disabled: boolean;
  onAdd: () => void;
  onEditTag: (tag: Tag) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View>
      <Button label="Tambah tag" disabled={disabled} onPress={onAdd} />
      {tags
        .filter((tag) => !tag.archived)
        .map((tag) => (
          <Card key={tag.id} padding="space4" style={styles.card}>
            <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
              {tag.name}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Token warna: {tag.colorToken} · {tag.state}
            </Text>
            <Button
              label={`Edit tag ${tag.name}`}
              disabled={disabled}
              variant="tertiary"
              onPress={() => onEditTag(tag)}
            />
          </Card>
        ))}
    </View>
  );
}

function RulePanel({
  rules,
  disabled,
  onSelect,
  onPreview,
}: {
  rules: ClassificationRule[];
  disabled: boolean;
  onSelect: (id: string) => void;
  onPreview: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View>
      <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
        Kondisi AND 1–8 · operator: {RULE_OPERATORS.join(', ')}
      </Text>
      <Button label="Buat aturan fixture" disabled={disabled} onPress={onPreview} />
      {rules.map((rule) => (
        <Card key={rule.id} padding="space4" style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            {rule.name}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Status: {rule.state} · Priority: {rule.priority} · {rule.conditions.length} kondisi
          </Text>
          <Button
            label={`Pilih rule ${rule.name}`}
            disabled={disabled}
            onPress={() => onSelect(rule.id)}
          />
          <Button
            label={rule.id === rules[0]?.id ? 'Uji preview fixture' : `Uji preview ${rule.name}`}
            disabled={disabled}
            onPress={onPreview}
          />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    minWidth: CATEGORY_LAYOUT.minimumWidth,
  },
  content: {
    flexGrow: 1,
    gap: 16,
    padding: 20,
    minWidth: CATEGORY_LAYOUT.minimumWidth,
    maxWidth: CATEGORY_LAYOUT.contentMaxWidth,
  },
  headerRow: { gap: 8 },
  title: { flexShrink: 1 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { gap: 10 },
});
