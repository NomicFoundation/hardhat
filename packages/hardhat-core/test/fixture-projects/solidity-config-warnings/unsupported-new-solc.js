const {
  getLatestSupportedVersion,
  increasePatch,
} = require("../../internal/hardhat-network/stack-traces/compilers-list");

const nextUnsupportedVersion = increasePatch(getLatestSupportedVersion());

module.exports = {
  solidity: nextUnsupportedVersion,
};
