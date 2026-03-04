import { defineConfig } from "cspell";

export default defineConfig({
  version: "0.2",
  language: "en",
  files: [
    "*.{js,ts,md,json,yml,yaml,mjs,cjs,mts,cts}",
    "{.github,scripts,v-next}/**/*.{js,ts,md,json,yml,yaml,mjs,cjs,mts,cts}",
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
    "v-next/*/node_modules",
    "v-next/*/dist",
    "v-next/*/CHANGELOG.md",
    ".github/config/regression-tests.yml",
    "v-next/hardhat-vendored/{src,test}/**/*",
    "**/vendored/**/*",
    "**/vendor/**/*",
    "**/coverage/html/**/*",
    "**/artifacts/**/*.json",
    "**/artifacts/**/*.d.ts",
    "**/build-info/**/*",
  ],
});
