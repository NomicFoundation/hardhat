module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.3",
      },
      {
        version: "0.5.5",
      },
      {
        version: "0.8.20",
        settings: {
          evmVersion: "paris",
        },
      },
      {
        version: "0.8.21",
        settings: {
          evmVersion: "shanghai",
        },
      },
    ],
  },
};
