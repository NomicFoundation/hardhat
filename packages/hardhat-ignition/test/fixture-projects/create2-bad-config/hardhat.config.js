export default {
  solidity: {
    profiles: {
      default: {
        version: "0.8.19",
      },
      production: {
        version: "0.8.19",
      },
    },
  },
  ignition: {
    strategyConfig: {
      create2: {
        salt: undefined, // Missing salt
      },
    },
  },
};
