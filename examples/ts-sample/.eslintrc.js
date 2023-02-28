module.exports = {
  extends: ["plugin:prettier/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsConfigRootDir: "./",
  },
  plugins: ["eslint-plugin-import", "@typescript-eslint"],
  env: {
    es6: true,
    node: true,
  },
  rules: {
    "no-console": "error",
  },
  ignorePatterns: ["post-build.js", "artifacts/*", "cache/*"],
};
