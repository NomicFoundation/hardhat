const {
  getNextUnsupportedVersion,
  getNextNextUnsupportedVersion,
} = require("../../internal/hardhat-network/stack-traces/compilers-list");

module.exports = {
  solidity: {
    compilers: [
      {
        version: getNextUnsupportedVersion(),
      },
      {
        version: getNextNextUnsupportedVersion(),
      },
    ],
  },
};
