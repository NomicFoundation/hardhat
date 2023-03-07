module.exports = {
  extends: [`${__dirname}/../.eslintrc.js`],
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
  },
};
