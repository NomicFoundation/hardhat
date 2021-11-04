module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.0",
      },
    ],
    overrides: {
      "contracts/Foo.sol": { version: "0.8.10" },
    },
  },
};
