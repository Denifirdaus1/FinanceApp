import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { ReceiptCaptureWireframe } from '../receipt-capture-wireframe';
import {
  RECEIPT_LAYOUT,
  createReceiptFixture,
  validateFileFixture,
  validateReceiptDraft,
  type ReceiptDraft,
  type ReceiptScenario,
} from '../receipt-fixture';

jest.setTimeout(30000);

function renderWireframe(scenario?: ReceiptScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <ReceiptCaptureWireframe fixture={createReceiptFixture(scenario)} />
    </ThemeProvider>,
  );
}

const validDraft: ReceiptDraft = {
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

describe('U10 F07 receipt capture and OCR wireframe', () => {
  it('connects F07 route and receipt handoff without changing the global capture contract', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F07')).toMatchObject({
      routeId: 'receipt-capture',
      path: '/receipt-capture',
      navigationGroup: 'transactions',
      readiness: 'WIREFRAME READY',
    });
    expect(RECEIPT_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/receipt-capture' });
    expect(await routerScreen.findByText('Receipt capture (fixture)')).toBeTruthy();
  });

  it('supports camera/gallery/PDF source choices and just-in-time permission fallback', () => {
    expect(createReceiptFixture().chooseSource('camera')).toMatchObject({
      kind: 'permission_prompt',
    });
    expect(createReceiptFixture().chooseSource('gallery')).toMatchObject({ kind: 'picker_opened' });
    expect(createReceiptFixture().chooseSource('pdf')).toMatchObject({
      kind: 'unsupported',
      fallback: 'manual_or_photo',
    });
    expect(createReceiptFixture('permission_denied').requestCameraPermission()).toMatchObject({
      kind: 'denied',
      fallback: ['gallery', 'manual'],
      broadGalleryPermission: false,
    });
    expect(createReceiptFixture('camera_unavailable').requestCameraPermission()).toMatchObject({
      kind: 'unavailable',
      fallback: 'manual',
    });
  });

  it('guards MIME, size, dimensions, HEIC conversion, corruption, and memory safely', () => {
    expect(
      validateFileFixture({ mime: 'image/jpeg', sizeBytes: 1000, width: 1200, height: 800 }),
    ).toEqual({
      kind: 'accepted',
      workingMaxPx: 2048,
    });
    expect(
      validateFileFixture({ mime: 'application/pdf', sizeBytes: 1000, width: 1, height: 1 }),
    ).toMatchObject({ kind: 'pdf_unsupported' });
    expect(
      validateFileFixture({ mime: 'image/heic', sizeBytes: 1000, width: 1200, height: 800 }),
    ).toMatchObject({ kind: 'heic_conversion' });
    expect(
      validateFileFixture({ mime: 'image/gif', sizeBytes: 1000, width: 1200, height: 800 }),
    ).toMatchObject({ kind: 'unsupported_mime' });
    expect(
      validateFileFixture({
        mime: 'image/png',
        sizeBytes: 15 * 1024 * 1024 + 1,
        width: 1200,
        height: 800,
      }),
    ).toMatchObject({ kind: 'oversized' });
    expect(
      validateFileFixture({ mime: 'image/png', sizeBytes: 1000, width: 5000, height: 5000 }),
    ).toMatchObject({ kind: 'too_many_pixels' });
    expect(
      validateFileFixture({ mime: 'image/png', sizeBytes: 1000, width: 12001, height: 800 }),
    ).toMatchObject({ kind: 'dimension_limit' });
    expect(
      validateFileFixture({
        mime: 'image/png',
        sizeBytes: 1000,
        width: 1200,
        height: 800,
        corrupt: true,
      }),
    ).toMatchObject({ kind: 'corrupt' });
    expect(
      validateFileFixture({
        mime: 'image/png',
        sizeBytes: 1000,
        width: 1200,
        height: 800,
        oom: true,
      }),
    ).toMatchObject({ kind: 'out_of_memory' });
  });

  it('exposes on-device preprocessing/OCR progress and quality recovery states', () => {
    const fixture = createReceiptFixture();
    expect(fixture.preprocess('crop')).toMatchObject({ kind: 'preprocessing', onDevice: true });
    expect(fixture.preprocess('rotate')).toMatchObject({ kind: 'preprocessing', onDevice: true });
    expect(fixture.preprocess('perspective')).toMatchObject({
      kind: 'preprocessing',
      onDevice: true,
    });
    expect(fixture.preprocess('contrast')).toMatchObject({ kind: 'preprocessing', onDevice: true });
    expect(fixture.ocrProgress('recognizing')).toMatchObject({
      kind: 'recognizing',
      onDevice: true,
    });
    expect(fixture.ocrProgress('parsing')).toMatchObject({ kind: 'parsing', onDevice: true });
    expect(createReceiptFixture('low_confidence').reviewState()).toMatchObject({
      requiresCorrection: true,
    });
    expect(createReceiptFixture('arithmetic_mismatch').reviewState()).toMatchObject({
      arithmeticMismatch: true,
    });
  });

  it('validates corrected fields and requires explicit review before confirmation', () => {
    expect(validateReceiptDraft(validDraft)).toMatchObject({ ok: true, requiresReview: true });
    expect(validateReceiptDraft({ ...validDraft, totalMinor: '124999' })).toMatchObject({
      ok: false,
      reason: 'arithmetic_mismatch',
    });
    expect(validateReceiptDraft({ ...validDraft, merchant: '' })).toMatchObject({ ok: false });
    expect(validateReceiptDraft({ ...validDraft, totalMinor: '0' })).toMatchObject({ ok: false });
    expect(createReceiptFixture('low_confidence').confirm(validDraft, false)).toMatchObject({
      kind: 'review_required',
      draftRetained: true,
    });
    expect(createReceiptFixture('arithmetic_mismatch').confirm(validDraft, true)).toMatchObject({
      kind: 'review_required',
      draftRetained: true,
    });
  });

  it('keeps image opt-in, confirms transaction first, purges on cancel, and retries upload idempotently', () => {
    const noImage = createReceiptFixture().confirm(validDraft, true);
    expect(noImage).toMatchObject({
      kind: 'confirmed',
      transactionCreated: true,
      attachment: null,
      localImagePurged: true,
    });
    const withImage = createReceiptFixture('upload_pending').confirm(
      { ...validDraft, keepImage: true },
      true,
    );
    expect(withImage).toMatchObject({
      kind: 'confirmed',
      transactionCreated: true,
      attachment: { status: 'upload_pending' },
    });
    const upload = createReceiptFixture('upload_failed');
    expect(upload.confirm({ ...validDraft, keepImage: true }, true)).toMatchObject({
      transactionCreated: true,
      attachment: { status: 'failed' },
    });
    expect(upload.retryUpload()).toEqual(upload.retryUpload());
    expect(createReceiptFixture().cancel()).toMatchObject({
      kind: 'cancelled',
      transactionCreated: false,
      attachment: null,
      localImagePurged: true,
    });
  });

  it('renders detail, recovery, read-only, and kill-switch actions without leaking OCR payload', () => {
    const detail = createReceiptFixture('missing_object').detail();
    expect(detail).toMatchObject({ imageState: 'missing', canRelink: true });
    expect(detail).not.toHaveProperty('rawOcr');
    expect(detail).not.toHaveProperty('boundingBoxes');
    expect(detail).not.toHaveProperty('signedUrl');
    expect(createReceiptFixture('permission_revoked').detail()).toMatchObject({
      imageState: 'inaccessible',
      readOnly: true,
    });
    expect(createReceiptFixture('read_only').deleteAttachment(false)).toMatchObject({
      kind: 'read_only',
    });
    expect(createReceiptFixture('ready').deleteAttachment(true)).toMatchObject({
      kind: 'attachment_tombstone',
      transactionDeleted: false,
    });
  });

  it('renders all important states and every primary action with visible deterministic output', () => {
    for (const scenario of [
      'ready',
      'loading',
      'empty',
      'offline',
      'ocr_unavailable',
      'invalid_mime',
      'oversized',
      'corrupt',
      'low_confidence',
      'arithmetic_mismatch',
      'upload_pending',
      'upload_failed',
      'missing_object',
      'permission_revoked',
      'read_only',
      'kill_switch',
    ] as ReceiptScenario[]) {
      const rendered = renderWireframe(scenario);
      expect(screen.getByText('Receipt capture (fixture)')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Choose camera' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Choose gallery' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Choose PDF fallback' })).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Choose PDF fallback' }));
      expect(screen.getByRole('alert')).toBeTruthy();
      rendered.unmount();
    }
  });

  it('supports review flow, back preservation, accessibility, reduced motion, 320dp, and no network/logging', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    renderWireframe();
    fireEvent.press(screen.getByRole('button', { name: 'Choose camera' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to preprocess' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to review' }));
    expect(screen.getByText('Hasil scan — periksa kembali')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to capture' }));
    expect(screen.getByText('Receipt capture (fixture)')).toBeTruthy();
    expect(screen.getByText(/Minimum width 320dp/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose camera' })).toHaveProp(
      'accessibilityRole',
      'button',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('exercises preprocess, correction, confirmation, and back actions', () => {
    const onBack = jest.fn();
    render(
      <ThemeProvider reducedMotion={false}>
        <ReceiptCaptureWireframe onBack={onBack} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole('button', { name: 'Choose camera' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to preprocess' }));
    for (const label of ['Crop', 'Rotate', 'Perspective', 'Contrast', 'Run recognizing']) {
      fireEvent.press(screen.getByRole('button', { name: label }));
    }
    fireEvent.press(screen.getByRole('button', { name: 'Continue to review' }));
    fireEvent.changeText(screen.getByLabelText('Merchant'), 'Fixture merchant');
    fireEvent.changeText(screen.getByLabelText('Total minor unit'), '125000');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan gambar struk: OFF' }));
    fireEvent.press(screen.getByRole('button', { name: 'Confirm receipt transaction' }));
    expect(screen.getByText('Receipt detail (fixture)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open receipt detail' })).toBeTruthy();
  });

  it('exercises upload retry action in the detail view', () => {
    renderWireframe('upload_pending');
    fireEvent.press(screen.getByRole('button', { name: 'Choose camera' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to preprocess' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to review' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan gambar struk: OFF' }));
    fireEvent.press(screen.getByRole('button', { name: 'Confirm receipt transaction' }));
    fireEvent.press(screen.getByRole('button', { name: 'Retry image upload' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('exercises relink action for a missing receipt object', () => {
    renderWireframe('missing_object');
    fireEvent.press(screen.getByRole('button', { name: 'Choose camera' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to preprocess' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to review' }));
    fireEvent.press(screen.getByRole('button', { name: 'Confirm receipt transaction' }));
    fireEvent.press(screen.getByRole('button', { name: 'Relink receipt' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('exercises read-only attachment recovery action', () => {
    renderWireframe('read_only');
    fireEvent.press(screen.getByRole('button', { name: 'Choose camera' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to preprocess' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to review' }));
    fireEvent.press(screen.getByRole('button', { name: 'Confirm receipt transaction' }));
    fireEvent.press(screen.getByRole('button', { name: 'Delete receipt image' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
