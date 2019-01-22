import { BuidlerConfig } from "../../../types";

const defaultConfig: BuidlerConfig = {
  solc: {
    version: require("solc/package.json").version,
    optimizer: {
      enabled: false,
      runs: 200
    },
    evmVersion: "byzantium"
  },
  networks: {
    develop: {
      url: "http://127.0.0.1:8545"
    },
    auto: {
      blockGasLimit: 7500000
      // You can set-up accounts here like this:
      // accounts: [
      //   {
      //     privateKey:
      //       "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200",
      //     balance: 1000000000000000000000000
      //   }
      // ]
    }
  }
};

export default defaultConfig;
