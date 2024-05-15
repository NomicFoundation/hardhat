export default {
  solidity: {
    compilers: [
      {
        version: "0.4.11", // Value not present in solc-info.ts file
      },
      {
        version: "0.5.5", // Value taken from solc-info.ts file
      },
      {
        version: "0.8.20",
        settings: {
          evmVersion: "paris", // Overwrite default value in solc-info.ts file
        },
      },
      {
        version: "0.8.21",
        settings: {
          evmVersion: "shanghai", // Same as default value in solc-info.ts file
        },
      },
    ],
  },
};
