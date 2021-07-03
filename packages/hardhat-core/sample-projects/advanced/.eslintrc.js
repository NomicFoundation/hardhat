module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  extends: [
    "standard",
    "plugin:prettier/recommended",
    "plugin:node/recommended",
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  overrides: [
    {
      files: ["scripts/**"],
      rules: { "no-process-exit": "off" },
    },
    {
      files: ["hardhat.config.js", "scripts/**", "test/**"],
      rules: { "node/no-unpublished-require": "off" },
    },
  ],
};
