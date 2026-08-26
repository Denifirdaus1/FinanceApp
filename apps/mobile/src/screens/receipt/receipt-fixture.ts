export const RECEIPT_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

export const RECEIPT_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ReceiptImageMime = (typeof RECEIPT_IMAGE_MIME)[number];

export type ReceiptScenario =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'permission_denied'
  | 'camera_unavailable'
  | 'ocr_unavailable'
  | 'invalid_mime'
  | 'oversized'
  | 'too_many_pixels'
  | 'dimension_limit'
  | 'heic_conversion'
  | 'corrupt'
  | 'oom'
  | 'low_confidence'
  | 'arithmetic_mismatch'
  | 'upload_pending'
  | 'upload_failed'
  | 'missing_object'
  | 'permission_revoked'
  | 'read_only'
  | 'kill_switch';

export type ReceiptSource = 'camera' | 'gallery' | 'pdf';
export type PreprocessStep = 'crop' | 'rotate' | 'perspective' | 'contrast';
export type OcrStep = 'recognizing' | 'parsing';

export interface ReceiptDraft {
  merchant: string;
  purchasedAt: string;
  subtotalMinor: string;
  discountMinor: string;
  taxMinor: string;
  serviceMinor: string;
  totalMinor: string;
  accountId: string;
  categoryId: string;
  tagIds: string[];
  items: { label: string; amountMinor: string }[];
  keepImage: boolean;
}

export interface ReceiptFileFixture {
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
  corrupt?: boolean;
  oom?: boolean;
}

export type FileGuardResult =
  | { kind: 'accepted'; workingMaxPx: 2048 }
  | { kind: 'pdf_unsupported'; fallback: 'manual_or_photo' }
  | { kind: 'heic_conversion'; targetMime: ReceiptImageMime; localOnly: true }
  | { kind: 'unsupported_mime' }
  | { kind: 'oversized'; maxMiB: 15 }
  | { kind: 'too_many_pixels'; maxMegapixels: 20 }
  | { kind: 'dimension_limit'; maxPx: 12000 }
  | { kind: 'corrupt' }
  | { kind: 'out_of_memory' };

export function validateFileFixture(input: ReceiptFileFixture): FileGuardResult {
  if (input.corrupt) return { kind: 'corrupt' };
  if (input.oom) return { kind: 'out_of_memory' };
  if (input.mime === 'application/pdf')
    return { kind: 'pdf_unsupported', fallback: 'manual_or_photo' };
  if (input.mime === 'image/heic')
    return { kind: 'heic_conversion', targetMime: 'image/jpeg', localOnly: true };
  if (!(RECEIPT_IMAGE_MIME as readonly string[]).includes(input.mime))
    return { kind: 'unsupported_mime' };
  if (input.sizeBytes > 15 * 1024 * 1024) return { kind: 'oversized', maxMiB: 15 };
  if (input.width * input.height > 20_000_000)
    return { kind: 'too_many_pixels', maxMegapixels: 20 };
  if (Math.max(input.width, input.height) > 12_000)
    return { kind: 'dimension_limit', maxPx: 12000 };
  return { kind: 'accepted', workingMaxPx: 2048 };
}

function parseMinor(input: string, allowZero = true): bigint | null {
  const normalized = input.trim();
  if (!new RegExp(allowZero ? '^\\d+$' : '^[1-9]\\d*$', 'u').test(normalized)) return null;
  try {
    const value = BigInt(normalized);
    return value <= 9_000_000_000_000_000n ? value : null;
  } catch {
    return null;
  }
}

export function validateReceiptDraft(
  draft: ReceiptDraft,
):
  | { ok: true; requiresReview: true }
  | { ok: false; reason: 'merchant' | 'date' | 'amount' | 'arithmetic_mismatch' } {
  const merchant = draft.merchant.trim();
  if (merchant.length < 1 || merchant.length > 120) return { ok: false, reason: 'merchant' };
  if (!Number.isFinite(Date.parse(draft.purchasedAt))) return { ok: false, reason: 'date' };
  const subtotal = parseMinor(draft.subtotalMinor);
  const discount = parseMinor(draft.discountMinor);
  const tax = parseMinor(draft.taxMinor);
  const service = parseMinor(draft.serviceMinor);
  const total = parseMinor(draft.totalMinor, false);
  if (subtotal === null || discount === null || tax === null || service === null || total === null)
    return { ok: false, reason: 'amount' };
  if (subtotal - discount + tax + service !== total)
    return { ok: false, reason: 'arithmetic_mismatch' };
  return { ok: true, requiresReview: true };
}

type ReceiptState =
  | 'idle'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'permission_denied'
  | 'ocr_unavailable'
  | 'validation_error'
  | 'review'
  | 'upload_pending'
  | 'upload_failed'
  | 'missing_object'
  | 'permission_revoked'
  | 'read_only';

export interface ReceiptFixtureStatus {
  state: ReceiptState;
  onDevice: true;
  keepImageDefault: false;
}

function stateFor(scenario: ReceiptScenario): ReceiptState {
  if (scenario === 'loading') return 'loading';
  if (scenario === 'empty') return 'empty';
  if (scenario === 'offline') return 'offline';
  if (scenario === 'permission_denied' || scenario === 'camera_unavailable')
    return 'permission_denied';
  if (scenario === 'ocr_unavailable') return 'ocr_unavailable';
  if (scenario === 'low_confidence' || scenario === 'arithmetic_mismatch') return 'review';
  if (scenario === 'upload_pending') return 'upload_pending';
  if (scenario === 'upload_failed') return 'upload_failed';
  if (scenario === 'missing_object') return 'missing_object';
  if (scenario === 'permission_revoked') return 'permission_revoked';
  if (scenario === 'read_only' || scenario === 'kill_switch') return 'read_only';
  if (
    [
      'invalid_mime',
      'oversized',
      'too_many_pixels',
      'dimension_limit',
      'heic_conversion',
      'corrupt',
      'oom',
    ].includes(scenario)
  )
    return 'validation_error';
  return 'idle';
}

export function receiptStateLabel(state: ReceiptState): string {
  if (state === 'idle') return 'Siap memilih sumber fixture.';
  if (state === 'loading') return 'Memuat capture fixture…';
  if (state === 'empty') return 'Belum ada capture fixture.';
  if (state === 'offline') return 'Offline: OCR tetap on-device dan draft lokal dipertahankan.';
  if (state === 'permission_denied')
    return 'Permission kamera ditolak; gunakan photo picker atau manual.';
  if (state === 'ocr_unavailable') return 'OCR on-device tidak tersedia; lanjutkan manual.';
  if (state === 'validation_error') return 'File fixture tidak dapat diproses dengan aman.';
  if (state === 'review') return 'Hasil scan — periksa kembali.';
  if (state === 'upload_pending')
    return 'Upload gambar tertunda; transaksi sudah diproses lebih dahulu.';
  if (state === 'upload_failed') return 'Upload gambar gagal; transaksi tetap tidak digandakan.';
  if (state === 'missing_object') return 'Objek gambar tidak ditemukan; relink fixture tersedia.';
  if (state === 'permission_revoked') return 'Akses receipt dicabut; detail menjadi read-only.';
  return 'Read-only atau kill switch: gunakan fallback manual.';
}

export function createReceiptFixture(scenario: ReceiptScenario = 'ready') {
  const draft: ReceiptDraft = {
    merchant: 'Toko Fixture',
    purchasedAt: '2026-08-26T10:00:00.000Z',
    subtotalMinor: '120000',
    discountMinor: '5000',
    taxMinor: '10000',
    serviceMinor: '0',
    totalMinor: '125000',
    accountId: 'account-cash-fixture',
    categoryId: 'category-food',
    tagIds: ['tag-groceries'],
    items: [{ label: 'Item fixture', amountMinor: '120000' }],
    keepImage: false,
  };
  let uploadRetryResult: { kind: 'upload_ready'; transactionCreated: false } | undefined;
  return {
    scenario,
    status: {
      state: stateFor(scenario),
      onDevice: true,
      keepImageDefault: false,
    } satisfies ReceiptFixtureStatus,
    draft() {
      return {
        ...draft,
        tagIds: [...draft.tagIds],
        items: draft.items.map((item) => ({ ...item })),
      };
    },
    chooseSource(source: ReceiptSource) {
      if (source === 'pdf')
        return { kind: 'unsupported' as const, fallback: 'manual_or_photo' as const };
      return source === 'camera'
        ? { kind: 'permission_prompt' as const, justInTime: true }
        : { kind: 'picker_opened' as const, broadGalleryPermission: false };
    },
    requestCameraPermission() {
      if (scenario === 'permission_denied')
        return {
          kind: 'denied' as const,
          fallback: ['gallery', 'manual'] as const,
          broadGalleryPermission: false,
        };
      if (scenario === 'camera_unavailable')
        return { kind: 'unavailable' as const, fallback: 'manual' as const };
      return { kind: 'allowed' as const, justInTime: true };
    },
    preprocess(step: PreprocessStep) {
      return { kind: 'preprocessing' as const, step, onDevice: true, cloudFallback: false };
    },
    ocrProgress(step: OcrStep) {
      return { kind: step, onDevice: true, cloudFallback: false };
    },
    reviewState() {
      return {
        requiresCorrection: scenario === 'low_confidence',
        arithmeticMismatch: scenario === 'arithmetic_mismatch',
        confidenceCue: 'label_and_icon' as const,
      };
    },
    confirm(input: ReceiptDraft, confirmed: boolean) {
      const validation = validateReceiptDraft(input);
      if (
        !confirmed ||
        !validation.ok ||
        scenario === 'low_confidence' ||
        scenario === 'arithmetic_mismatch'
      )
        return { kind: 'review_required' as const, draftRetained: true };
      if (!input.keepImage)
        return {
          kind: 'confirmed' as const,
          transactionCreated: true,
          attachment: null,
          localImagePurged: true,
          idempotent: true,
        };
      const status =
        scenario === 'upload_failed' ? ('failed' as const) : ('upload_pending' as const);
      return {
        kind: 'confirmed' as const,
        transactionCreated: true,
        attachment: { status },
        localImagePurged: false,
        idempotent: true,
      };
    },
    cancel() {
      return {
        kind: 'cancelled' as const,
        transactionCreated: false,
        attachment: null,
        localImagePurged: true,
      };
    },
    retryUpload() {
      if (!uploadRetryResult)
        uploadRetryResult = { kind: 'upload_ready', transactionCreated: false };
      return uploadRetryResult;
    },
    detail() {
      if (scenario === 'permission_revoked')
        return { imageState: 'inaccessible' as const, readOnly: true };
      if (scenario === 'missing_object') return { imageState: 'missing' as const, canRelink: true };
      if (scenario === 'upload_pending')
        return { imageState: 'upload_pending' as const, canRetry: true };
      if (scenario === 'upload_failed') return { imageState: 'failed' as const, canRetry: true };
      return {
        imageState: 'none' as const,
        readOnly: scenario === 'read_only' || scenario === 'kill_switch',
      };
    },
    deleteAttachment(confirmed: boolean) {
      if (
        scenario === 'read_only' ||
        scenario === 'kill_switch' ||
        scenario === 'permission_revoked'
      )
        return { kind: 'read_only' as const };
      return confirmed
        ? { kind: 'attachment_tombstone' as const, transactionDeleted: false }
        : { kind: 'confirmation_required' as const };
    },
    relinkAttachment(confirmed: boolean) {
      return confirmed
        ? { kind: 'relink_pending' as const }
        : { kind: 'confirmation_required' as const };
    },
  };
}

export type ReceiptFixture = ReturnType<typeof createReceiptFixture>;
