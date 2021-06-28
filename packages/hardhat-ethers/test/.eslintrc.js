module.exports = {
  extends: ["../.eslintrc.js"],
  parserOptions: {
    project: "tsconfig.json",
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
