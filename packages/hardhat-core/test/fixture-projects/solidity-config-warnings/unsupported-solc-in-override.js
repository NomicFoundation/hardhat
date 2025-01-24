const { getNextUnsupportedVersion } = require("../../helpers/compilation");

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
