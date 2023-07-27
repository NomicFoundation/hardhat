const {
  getLatestSupportedVersion,
  increasePatch,
} = require("../../internal/hardhat-network/stack-traces/compilers-list");

const nextUnsupportedVersion = increasePatch(getLatestSupportedVersion());

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.0",
      },
    ],
    overrides: {
      "contracts/Foo.sol": { version: nextUnsupportedVersion },
    },
  },
};
