const { createConfig } = require("../../config-v-next/eslint.cjs");

module.exports = createConfig(__filename);

module.exports.rules["no-restricted-imports"][1].paths.push({
  // TODO: Rename this once we migrate to the official package names
  name: "@ignored/hardhat-vnext-core",
  importNames: ["createBaseHardhatRuntimeEnvironment"],
  message:
    "Use `createHardhatRuntimeEnvironment` from `hre.js` instead of this function.",
});
