const featureId = process.argv[2];

if (!/^F\d{2}$/.test(featureId ?? '')) {
  console.error('Usage: pnpm test:e2e:feature <FEATURE_ID> (example: pnpm test:e2e:feature F05)');
  process.exit(2);
}

console.log(
  `[test:e2e:feature] FEATURE=${featureId}: feature-scoped Maestro journeys are wired in Task S03; none exist in the S00 scaffold.`,
);
