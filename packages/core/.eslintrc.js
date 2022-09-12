const { resolve } = require("path");

module.exports = {
  extends: [resolve(__dirname, "../../config/eslint/.eslintrc.js")],
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
    sourceType: "module",
  },
  rules: {
    "no-console": "error",
  },
  ignorePatterns: ["post-build.js"],
};
