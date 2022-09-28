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
};
