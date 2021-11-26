module.exports = {
  extends: [`${__dirname}/../../config/eslint/eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/src/tsconfig.json`,
    sourceType: "module"
  },
  rules: {
    "@nomiclabs/hardhat-internal-rules/only-hardhat-error": "error"
  }
};
