const { onlyHardhatErrorRule } = require("./onlyHardhatErrorRule");

const rules = {
  "only-hardhat-error": {
    create: onlyHardhatErrorRule,
  },
};

module.exports = { rules };
