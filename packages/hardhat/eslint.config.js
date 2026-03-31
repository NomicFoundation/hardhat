import { createConfig } from "../config/eslint.config.js";

const config = createConfig(import.meta.filename);

// General rules for template projects
const templatesConfig = {
  ...config[0], // First item is general config for hh3 codebase
  files: ["templates/**/*.ts"],
  ignores: ["templates/**/types/**"],
  rules: {
    ...config[0].rules,
    "import/no-extraneous-dependencies": "off", // hardhat is used as a dev dependency
    "no-restricted-syntax": "off", // top-level await
  },
};

// Rules for test files inside template projects
const templatesTestConfig = {
  ...templatesConfig,
  files: ["templates/**/test/*.ts"],
  rules: {
    ...templatesConfig.rules,
    "@typescript-eslint/no-floating-promises": "off", // 'describe' and 'it' functions from node:test
  },
};

config.push(templatesConfig);
config.push(templatesTestConfig);

export default config;
