const { onlyHardhatErrorRule } = require("./onlyHardhatErrorRule");

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
};

module.exports = { rules };
