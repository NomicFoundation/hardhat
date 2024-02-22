module.exports = {
  extends: [`${__dirname}/../.eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/../tsconfig.json`,
    sourceType: "module",
  },
  rules: {
    "@nomicfoundation/hardhat-internal-rules/only-hardhat-error": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
  },
};
