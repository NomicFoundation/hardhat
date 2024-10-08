module.exports = {
  extends: [`${__dirname}/../.eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/../tsconfig.json`,
    sourceType: "module",
  },
  ignorePatterns: [
    "/fixture-projects/hardhat-project/artifacts",
    "/fixture-projects/hardhat-project/cache",
  ],
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
