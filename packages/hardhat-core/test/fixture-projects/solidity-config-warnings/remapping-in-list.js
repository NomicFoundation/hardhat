module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.0",
        settings: {
          remappings: [":g=/dir"],
        },
      },
    ],
    overrides: {
      "contracts/Foo.sol": { version: "0.7.0" },
    },
  },
};
