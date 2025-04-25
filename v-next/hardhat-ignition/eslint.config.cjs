const { createConfig } = require("../config/eslint.config.cjs");


const configs = createConfig(__filename);

/**
 * @type {import("eslint").Linter.Config}
 */
const overrideConfig = {
  rules: {
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/switch-exhaustiveness-check": "off",
    "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",

    // off rules
    "no-restricted-syntax": "off",
    "@eslint-community/eslint-comments/require-description": "off",
    "@typescript-eslint/consistent-type-assertions": "off",
  },
};
configs.push(overrideConfig);

module.exports = configs;
