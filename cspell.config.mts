import { defineConfig } from "cspell";

export default defineConfig({
  version: "0.2",
  language: "en",
  files: [
    "*.{js,ts,md,json}",
    "{.github,scripts,v-next}/**/*.{js,ts,md,yml,yaml}",
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
    "node_modules",
    "v-next/*/node_modules",
    "v-next/*/dist",
    "v-next/*/CHANGELOG.md",
  ],
});
