const {
  getNextUnsupportedVersion,
} = require("../../internal/hardhat-network/stack-traces/compilers-list");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.0",
      },
    ],
    overrides: {
      "contracts/Foo.sol": { version: getNextUnsupportedVersion() },
    },
  },
};
