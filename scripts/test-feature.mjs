const featureId = process.argv[2];

if (!/^F\d{2}$/.test(featureId ?? '')) {
  console.error('Usage: pnpm test:feature <FEATURE_ID> (example: pnpm test:feature F05)');
  process.exit(2);
}

console.log(
  `[test:feature] FEATURE=${featureId}: feature-scoped unit/component tests are wired in Task S03; none exist in the S00 scaffold.`,
);
