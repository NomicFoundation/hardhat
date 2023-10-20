const {
  slowImportsCommonIgnoredModules,
} = require("../../config/eslint/constants");

module.exports = {
  extends: [`${__dirname}/../../config/eslint/eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/strict-boolean-expressions": [
      "error",
      {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false,
        allowAny: true,
      },
    ],
  },
  overrides: [
    {
      files: ["src/index.ts"],
      rules: {
        "@nomicfoundation/slow-imports/no-top-level-external-import": [
          "error",
          {
            ignoreModules: [
              ...slowImportsCommonIgnoredModules,
              "chai",
              "@nomiclabs/hardhat-web3-legacy",
            ],
          },
        ],
      },
    },
  ],
};
