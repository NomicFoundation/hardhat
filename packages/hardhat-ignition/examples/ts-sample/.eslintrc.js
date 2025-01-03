module.exports = {
  extends: ["plugin:prettier/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
  },
  plugins: ["eslint-plugin-import", "@typescript-eslint"],
  env: {
    es6: true,
    node: true,
  },
  rules: {
    "no-console": "error",
  },
  ignorePatterns: [".eslintrc.js", "artifacts/*", "cache/*"],
};
