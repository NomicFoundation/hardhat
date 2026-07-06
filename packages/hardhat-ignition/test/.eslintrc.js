module.exports = {
  extends: [`${__dirname}/../.eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/../tsconfig.test.json`,
    sourceType: "module",
  },
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
  },
};
