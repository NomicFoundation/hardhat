export default {
  solidity: {
    profiles: {
      default: {
        version: "0.8.19",
      },
      production: {
        version: "0.8.19",
        settings: {
          metadata: {
            // We disable the metadata to keep the fixtures more stable
            appendCBOR: false,
          },
        },
      },
    },
  },
  networks: {
    nothardhat: {
      type: "edr-simulated",
      chainId: 99999,
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
    },
  },
};
