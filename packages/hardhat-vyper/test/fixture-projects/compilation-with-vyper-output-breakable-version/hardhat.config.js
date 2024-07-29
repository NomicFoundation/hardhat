require("../../../src/index");

module.exports = {
  vyper: {
    compilers: [
      {
        version: "0.4.0",
        settings: {
          evmVersion: "paris",
          optimize: "gas",
        },
      },
    ],
  },
};
