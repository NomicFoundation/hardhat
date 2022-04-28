module.exports = {
  extends: [`${__dirname}/../.eslintrc.js`],
  rules: {
    "@typescript-eslint/restrict-template-expressions": "off",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
  },
};
