require("../../../src/index");

module.exports = {
  vyper: {
    compilers: [
      {
        version: "0.3.7",
        settings: {
          evmVersion: "paris",
          optimize: "gas",
        },
      },
    ],
  },
};
