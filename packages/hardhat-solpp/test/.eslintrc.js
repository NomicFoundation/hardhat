module.exports = {
  extends: ["../.eslintrc.js"],
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
  },
};
