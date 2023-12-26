module.exports = {
  extends: [`${__dirname}/../.eslintrc.js`],
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
  },
};
