const {
  getNextUnsupportedVersion,
  getNextNextUnsupportedVersion,
} = require("../../helpers/compilation");

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
