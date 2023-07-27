const {
  getNextUnsupportedVersion,
} = require("../../internal/hardhat-network/stack-traces/compilers-list");

module.exports = {
  solidity: getNextUnsupportedVersion(),
};
