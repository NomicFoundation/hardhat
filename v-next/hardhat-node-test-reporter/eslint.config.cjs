const { createConfig } = require("../../config-v-next/eslint.config.cjs");

const configs = createConfig(__filename);

/**
 * * @type {import("eslint").Linter.Config}
 */
const overrideConfig = {
  files: ["integration-tests/**/*.ts"],
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
    // Disabled until this gets resolved https://github.com/nodejs/node/issues/51292
    "@typescript-eslint/no-floating-promises": "off",
  },
};

configs.push(overrideConfig);
module.exports = configs;
