module.exports = {
  extends: [`${__dirname}/../../config/eslint/eslintrc.js`],
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
    sourceType: "module",
  },
  ignorePatterns: [".eslintrc.js", "**/fixture-projects/**/*"],
};
