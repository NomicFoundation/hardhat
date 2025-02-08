export default {
  solidity: {
    version: "0.8.19",
    settings: {
      metadata: {
        // We disable the metadata to keep the fixtures more stables
        appendCBOR: false,
      },
    },
  },
  defaultNetwork: "nothardhat",
  networks: {
    nothardhat: {
      type: "edr",
      chainId: 99999,
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
    },
  },
};
