import { defineConfig } from "cspell";

export default defineConfig({
  version: "0.2",
  language: "en",
  files: [
    "*.{js,ts,md,json,yml,yaml,mjs,cjs,mts,cts}",
    "{.github,scripts,packages,docs}/**/*.{js,ts,md,json,yml,yaml,mjs,cjs,mts,cts}",
  ],
  ignoreRandomStrings: true,
  allowCompoundWords: true,
  dictionaryDefinitions: [
    {
      name: "project-dictionary",
      path: "./cspell.dictionary.txt",
      addWords: true,
    },
  ],
  dictionaries: ["project-dictionary"],
  ignorePaths: [
    "pnpm-lock.yaml",
    "node_modules",
    "packages/*/node_modules",
    "packages/*/dist",
    "packages/*/CHANGELOG.md",
    ".github/config/regression-tests.yml",
    "packages/hardhat-vendored/{src,test}/**/*",
    "**/vendored/**/*",
    "**/vendor/**/*",
    // The html report that the `coverage` feature writes into a project's
    // coverage directory, including the fixture projects used to test it.
    "**/coverage/html/**/*",
    // The c8 output of `test:coverage`. Anchored at a package's root so that
    // the `coverage` feature's own sources keep being checked.
    "packages/*/coverage",
    "**/artifacts/**/*.json",
    "**/artifacts/**/*.d.ts",
    "**/build-info/**/*",
    "packages/*/artifacts",
    "packages/*/cache",
    "packages/*/test/fixture-projects/**/artifacts",
    "packages/*/test/fixture-projects/**/cache",
  ],
});
