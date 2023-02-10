const { onlyHardhatErrorRule, onlyHardhatPluginErrorRule } = require("./onlyHardhatErrorRule");

const rules = {
  "only-hardhat-error": {
    create: onlyHardhatErrorRule,
    meta: {
      type: "problem",
      schema: [],
      docs: {
        description: "Enforces that only HardhatError is thrown.",
      },
    },
  },
  "only-hardhat-plugin-error": {
    create: onlyHardhatPluginErrorRule,
    meta: {
      type: "problem",
      schema: [],
      docs: {
        description: "Enforces that only HardhatPluginError is thrown.",
      },
    },
  }
};

module.exports = { rules };
