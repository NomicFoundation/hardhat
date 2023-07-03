module.exports = {
  extends: [`${__dirname}/../../config/eslint/eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/src/tsconfig.json`,
    sourceType: "module"
  },
  rules: {
    "@nomiclabs/hardhat-internal-rules/only-hardhat-error": "error"
  },
  overrides: [{
    files: ["src/internal/cli/cli.ts", "src/register.ts", "src/internal/lib/hardhat-lib.ts"],
    rules: {
      "slow-imports/no-top-level-external-import": [
        "error",
        {
          ignoreModules: ["chalk", "debug", "find-up", "fs-extra", "semver", "source-map-support/register"],
        },
      ],
    }
  }]
};
