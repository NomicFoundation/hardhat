const { createConfig } = require("../../config-v-next/eslint.config.cjs");

const configs = createConfig(__filename, {
  onlyHardhatError: false,
});

/**
 * * @type {import("eslint").Linter.Config}
 */
const overrideConfig = {
  files: ["src/**/*.ts"],
  rules: {
    "@typescript-eslint/consistent-type-assertions": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "no-restricted-syntax": "off",
  },
};
configs.push(overrideConfig);

module.exports = configs;
