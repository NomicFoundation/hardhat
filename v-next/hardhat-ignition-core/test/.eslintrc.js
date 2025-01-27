module.exports = {
  extends: [`${__dirname}/../.eslintrc.cjs`],
  parserOptions: {
    project: `${__dirname}/../tsconfig.json`,
    sourceType: "module",
  },
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
    "import/no-unused-modules": [
      "error",
      { unusedExports: true, missingExports: false },
    ],
  },
};
