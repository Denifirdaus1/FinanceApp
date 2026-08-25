# U00 Design System Decision

## Scope

U00 supplies the semantic design-token source of truth and a small React Native
primitive library for later wireframes. It does not add a production route,
feature screen, backend contract, migration, or Storybook runtime dependency.

## Architecture

- `packages/ui/src/tokens` owns light/dark semantic colors, typography, spacing,
  radii, strokes, elevation, icon, motion, and chart tokens.
- `packages/ui/src/components` owns the frozen primitive components and the
  theme/reduced-motion context used by those components.
- `packages/ui/src/patterns` owns the reusable resource-state composition used
  by screens without introducing screen-specific APIs.
- `apps/mobile/src/storybook` is an internal deterministic catalog. It is not
  imported by the Expo router and does not install Storybook.
- The mobile theme provider adapts the UI provider while preserving the current
  `useTheme().colors` consumer shape.

## API decisions

- Every form control has a persistent `label`; error and hint text are exposed
  as accessible supporting content.
- `Button` requires a text `label`, including icon-style buttons, so icon-only
  actions cannot be created without a screen-reader name.
- Money values use `valueMinor` and `onChangeMinor`; the UI never stores a
  floating-point amount. IDR defaults to zero fractional digits and formats
  with Indonesian grouping.
- `SensitiveValue` takes an explicit hidden state and never places the visible
  value in the hidden accessibility label.
- `ChartFrame` requires a textual summary and supports a data-table alternative;
  its privacy mode hides chart descendants from assistive technology.
- `ThemeProvider` selects light/dark from the platform by default and accepts
  controlled `scheme` and `reducedMotion` overrides for deterministic tests and
  catalog review.

## State and accessibility rules

All interactive controls expose disabled, busy, invalid, expanded, or selected
state through React Native accessibility props. Minimum touch targets are 48 dp
and text containers use `minHeight` rather than fixed heights. Modal primitives
use platform close handling, return focus responsibility to the trigger, and
switch to non-animated presentation when reduced motion is enabled. Skeletons,
toasts, offline banners, permission states, and error states use explicit live
region or busy semantics instead of color alone.

## Test gates

- Unit tests cover money parsing/formatting, theme selection, reduced-motion
  behavior, and the visible states of each primitive.
- Contract tests freeze the public exports, token categories, semantic-only
  component styles, accessibility labels, touch-target constants, privacy
  redaction, and catalog coverage.
- The final U00 gate runs format, lint, typecheck, unit, contract, Expo config
  validation, and an Android Expo export smoke. Manual review records 320 dp,
  200% font scale, contrast, VoiceOver/TalkBack labels, reduced motion, and
  tabular money checks.

## Out of scope

U00 does not implement U01 navigation, F01-F24 wireframes, database changes,
S05 changes, EAS builds, or Maestro cloud/device smoke.
