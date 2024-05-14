const { createConfig } = require("../../config-v-next/eslint.cjs");

module.exports = createConfig(__filename, [
  "src/index.ts",
  "src/other-entry-point.ts",
]);
