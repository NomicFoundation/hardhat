module.exports = {
  extends: [`${__dirname}/../.eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/../tsconfig.json`,
    sourceType: "module",
  },
  rules: {
    "@nomiclabs/hardhat-internal-rules/only-hardhat-error": "off",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
  },
};
