export default {
  solidity: "0.8.19",
  networks: {
    default: {
      mining: {
        auto: false,
      },
    },
  },
  ignition: {
    requiredConfirmations: 42,
    maxFeeBumps: 1234,
  },
};
