module.exports = {
  extends: ["plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: "latest",
  },
  env: {
    es6: true,
    node: true,
  },
  rules: {
    "no-console": "error",
  },
  ignorePatterns: [".eslintrc.js", "artifacts/*", "cache/*"],
};
