const { createConfig } = require("../../config-v-next/eslint.config.cjs");

const configs = createConfig(__filename);

/**
 * @type {import("eslint").Linter.Config}
 */
const overrideConfig = {
  // Set the rules to default
  rules: {
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/switch-exhaustiveness-check": "off",
    "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
  },
};

configs.push(overrideConfig);
module.exports = configs;
