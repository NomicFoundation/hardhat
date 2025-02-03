const { createConfig } = require("../../config-v-next/eslint.cjs");

const config = createConfig(__filename);

delete config.rules["@typescript-eslint/naming-convention"];
delete config.rules["@typescript-eslint/switch-exhaustiveness-check"];
delete config.rules[
  "@typescript-eslint/use-unknown-in-catch-callback-variable"
];

module.exports = config;
