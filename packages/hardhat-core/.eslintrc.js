module.exports = {
  extends: [`${__dirname}/../../config/eslint/eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/src/tsconfig.json`,
    sourceType: "module"
  },
  rules: {
    "@nomiclabs/only-hardhat-error": "error"
  }
};
