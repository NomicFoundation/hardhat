const { createConfig } = require("../../config-v-next/eslint.cjs");

module.exports = createConfig(__filename);

module.exports.overrides.push({
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
});
