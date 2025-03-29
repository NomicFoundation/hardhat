const { createConfig } = require("../../config-v-next/eslint.config.cjs");

const configs = createConfig(__filename);

/**
 * @type {import("eslint").Linter.Config}
 */
const overrideConfig = {
  ignores: ["/test/fixture-projects"],
};

configs.push(overrideConfig);

module.exports = configs;
