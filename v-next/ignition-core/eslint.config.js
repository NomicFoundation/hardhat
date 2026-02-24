import { createConfig } from "../config/eslint.config.js";

const configs = createConfig(import.meta.filename, {
  onlyHardhatError: false,
});

/**
 * * @type {import("eslint").Linter.Config}
 */
const overrideConfig = {
  files: ["src/**/*.ts"],
  rules: {
    "@typescript-eslint/consistent-type-assertions": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "no-restricted-syntax": "off",
  },
};
configs.push(overrideConfig);

export default configs;
