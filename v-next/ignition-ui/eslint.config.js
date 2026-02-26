import { createConfig } from "../config/eslint.config.js";

const configs = createConfig(import.meta.filename);

/**
 * @type {import("eslint").Linter.Config}
 */
const overrideConfig = {
  // Set the rules to default
  rules: {
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/switch-exhaustiveness-check": "off",
    "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
    // hardhat-ignition-ui/src/queries/futures.ts use the @nomicfoundation/ignition-core but this package in devDependencies
    "import/no-extraneous-dependencies": "off",
  },
};

configs.push(overrideConfig);

export default configs;
