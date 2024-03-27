require("../../../../src/index");

module.exports = {
  vyper: {
    compilers: [
      {
        version: "0.3.10",
        settings: {
          evmVersion: "paris",
          optimize: true,
        },
      },
    ],
  },
};
