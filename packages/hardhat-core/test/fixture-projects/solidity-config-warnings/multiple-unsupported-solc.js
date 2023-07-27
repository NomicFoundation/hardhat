const {
  getLatestSupportedVersion,
  increasePatch,
} = require("../../internal/hardhat-network/stack-traces/compilers-list");

const nextUnsupportedVersion = increasePatch(getLatestSupportedVersion());
const nextNextUnsupportedVersion = increasePatch(nextUnsupportedVersion);

module.exports = {
  solidity: {
    compilers: [
      {
        version: nextUnsupportedVersion,
      },
      {
        version: nextNextUnsupportedVersion,
      },
    ],
  },
};
