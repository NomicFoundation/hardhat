const {
  slowImportsCommonIgnoredModules,
} = require("../../config/eslint/constants");

module.exports = {
  extends: [`${__dirname}/../../config/eslint/eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/src/tsconfig.json`,
    sourceType: "module",
  },
  rules: {
    "@nomicfoundation/hardhat-internal-rules/only-hardhat-error": "error",
  },
  overrides: [
    {
      files: [
        "src/internal/cli/cli.ts",
        "src/register.ts",
        "src/internal/lib/hardhat-lib.ts",
      ],
      rules: {
        "@nomicfoundation/slow-imports/no-top-level-external-import": [
          "error",
          {
            ignoreModules: [...slowImportsCommonIgnoredModules],
          },
        ],
      },
    },
  ],
};
