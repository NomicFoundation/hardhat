module.exports = {
  extends: ["../../config/eslint/eslintrc.js"],
  parserOptions: {
    project: "src/tsconfig.json",
    sourceType: "module",
  },
  rules: {
    "@nomiclabs/only-hardhat-error": "error",
  },
};
