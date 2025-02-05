const { createConfig } = require("../../config-v-next/eslint.cjs");

const config = createConfig(__filename);

delete config.rules["@typescript-eslint/naming-convention"];
delete config.rules["@typescript-eslint/switch-exhaustiveness-check"];
delete config.rules[
  "@typescript-eslint/use-unknown-in-catch-callback-variable"
];

config.rules["no-restricted-syntax"] = "off";
config.rules["@eslint-community/eslint-comments/require-description"] = "off";
config.rules["@typescript-eslint/consistent-type-assertions"] = "off";

module.exports = config;
