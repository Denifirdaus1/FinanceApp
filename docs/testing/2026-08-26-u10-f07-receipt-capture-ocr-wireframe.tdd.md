# U10 / F07 Receipt Capture & OCR Wireframe

## Scope

Frontend-only deterministic fixture wireframe. The implementation keeps OCR on-device in the UI contract, does not access real camera/gallery/PDF files, does not call network or Supabase, and never persists receipt data.

## TDD evidence

### RED

Command:

```text
pnpm --filter @financeapp/mobile test:unit -- receipt-capture-wireframe.test.tsx --runInBand --forceExit
```

Result: exit code 1. The contract suite failed before implementation because `../receipt-capture-wireframe` did not exist.

Checkpoint: `0d173b7 test: add U10 F07 receipt capture OCR wireframe contracts`.

### GREEN

Targeted command:

```text
pnpm --filter @financeapp/mobile test:unit -- receipt-capture-wireframe.test.tsx --coverage --collectCoverageFrom="src/screens/receipt/receipt-fixture.ts" --collectCoverageFrom="src/screens/receipt/receipt-capture-wireframe.tsx" --runInBand --forceExit
```

Result: exit code 0; 1 suite and 13 tests passed.

Targeted coverage:

| File | Statements | Branches |
| --- | ---: | ---: |
| `receipt-fixture.ts` | 96.92% | 95.45% |
| `receipt-capture-wireframe.tsx` | 84.51% | 80.36% |

## Implemented behavior

- Camera, system photo picker/gallery, and explicit PDF unsupported/manual fallback source choices.
- Just-in-time permission fixture, MIME/size/pixel/dimension/HEIC/corrupt/OOM guards.
- On-device crop/rotate/perspective/contrast and recognizing/parsing progress.
- Correction/review with confidence and arithmetic cues, explicit confirmation, image opt-in default OFF, transaction-first upload fixture, cancel purge fixture, receipt detail recovery.
- Hidden Expo Router route and minimal global capture handoff while preserving manual transaction capture.

## Quality gates

Recorded after the final implementation pass:

- `pnpm install --frozen-lockfile`: exit 0
- `pnpm format:check`: exit 0
- `pnpm lint`: exit 0
- `pnpm typecheck`: exit 0
- targeted U10 test and coverage: exit 0
- `pnpm test:unit`: exit 0; mobile 14 suites / 119 tests passed, with workspace domain/config/sync suites also passing
- `pnpm test:contract`: exit 0; 4 suites / 18 tests passed
- `pnpm test:coverage:u00`: exit 0; 1 suite / 22 tests passed, 87.92% statements / 81.85% branches
- `pnpm audit --audit-level high`: exit 0; one existing moderate vulnerability reported
- `npx expo config --type public`: exit 0
- `npx expo export --platform android --output-dir .expo-smoke-dist`: exit 0; Android bundle and `metadata.json` exported
- `git diff --check`: exit 0
- staged-equivalent secret scan: clean

## Security and scope review

- No fetch, Supabase, file-system, upload, Storage, persistence, or production OCR integration.
- No raw OCR, bounding boxes, signed URL, storage path, original filename, GPS/EXIF, credential, or sensitive identifier in UI output, URL, log, or analytics fixture.
- PDF remains a deterministic unsupported/manual/photo fallback; multi-page PDF and cloud OCR are not claimed.
- U11/F08 is not started and the tracker is not accessed or modified.

## Known risks / deferred work

Real camera/photo-picker integration, OCR engine integration, encrypted local retention, Storage upload, and production attachment lifecycle remain future implementation work outside U10.
