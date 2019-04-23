import { BuidlerConfig } from "../../../types";

const defaultConfig: BuidlerConfig = {
  solc: {
    version: require("solc/package.json").version,
    optimizer: {
      enabled: false,
      runs: 200
    },
    evmVersion: "petersburg"
  },
  networks: {
    develop: {
      url: "http://127.0.0.1:8545"
    },
    auto: {
      blockGasLimit: 7500000
    }
  }
};

export default defaultConfig;
