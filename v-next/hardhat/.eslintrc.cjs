const { createConfig } = require("../../config-v-next/eslint.cjs");

module.exports = createConfig(__filename);

module.exports.rules["no-restricted-imports"][1].paths.push({
  // TODO: Rename this once we migrate to the official package names
  name: "@ignored/hardhat-vnext-core",
  importNames: ["createHardhatRuntimeEnvironment"],
  message:
    "Use the version of `createHardhatRuntimeEnvironment` found in `hre.js` instead of this one.",
});
