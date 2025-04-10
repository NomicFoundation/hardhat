const { createConfig } = require("../../config-v-next/eslint.config.cjs");

const configs = createConfig(__filename);

/**
 * @type {import("eslint").Linter.Config}
 */
const overrideConfig = {
  ignores: ['/test/fixture-projects'],
  rules: {
    "@typescript-eslint/ban-ts-comment": 'off'
  }
}
configs.push(overrideConfig);

module.exports = configs;
