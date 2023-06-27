module.exports = {
  extends: [`${__dirname}/../../config/eslint/eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/src/tsconfig.json`,
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/no-non-null-assertion": "error"
  }
};
