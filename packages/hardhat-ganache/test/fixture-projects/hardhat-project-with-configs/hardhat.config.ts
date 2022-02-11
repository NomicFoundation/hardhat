import "../../../src/index";

export default {
  defaultNetwork: "ganache",
  networks: {
    ganache: {
      port: 8555,
      url: "http://127.0.0.1:8555",
      miner: {
        defaultGasPrice: 20000000000,
        defaultTransactionGasLimit: 6000000000,
      },
      wallet: {
        defaultBalance: 9,
        totalAccounts: 3,
        mnemonic:
          "polar velvet stereo oval echo senior cause cruel tube hobby exact angry",
      },
    },
  },
  solidity: "0.8.11",
};
