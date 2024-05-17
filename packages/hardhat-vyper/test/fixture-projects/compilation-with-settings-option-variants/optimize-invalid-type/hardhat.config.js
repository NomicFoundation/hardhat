require("../../../../src/index");

module.exports = {
  vyper: {
    compilers: [
      {
        version: "0.3.9",
        settings: {
          evmVersion: "paris",
          optimize: 12,
        },
      },
    ],
  },
};
