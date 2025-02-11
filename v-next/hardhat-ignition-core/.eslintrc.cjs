const { createConfig } = require("../../config-v-next/eslint.cjs");

const config = createConfig(__filename, {
  onlyHardhatError: false,
})

config.rules["@typescript-eslint/consistent-type-assertions"] = "off";
config.rules["@typescript-eslint/no-non-null-assertion"] = "off"
config.rules["@typescript-eslint/consistent-type-imports"] = "off"
config.rules["no-restricted-syntax"] = "off";

module.exports = config;
