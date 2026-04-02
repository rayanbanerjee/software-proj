export const sharedVitestInclude = [
  "tests/**/*.test.ts",
  "apps/**/tests/**/*.test.ts",
  "packages/**/tests/**/*.test.ts"
];

export const sharedVitestConfig = {
  coverage: {
    enabled: false
  },
  environment: "node" as const,
  include: sharedVitestInclude
};

