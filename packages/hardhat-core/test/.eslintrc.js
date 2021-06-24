module.exports = {
  extends: ["../.eslintrc.js"],
  parserOptions: {
    project: "tsconfig.json",
    sourceType: "module",
  },
  rules: {
    "@nomiclabs/only-hardhat-error": "off",
    "@typescript-eslint/dot-notation": "off",
  },
};
