import { BuidlerConfig } from "../../../types";

const defaultConfig: BuidlerConfig = {
  defaultNetwork: "develop",
  solc: {
    version: require("solc/package.json").version,
    optimizer: {
      enabled: false,
      runs: 200
    }
  },
  networks: {
    develop: {
      url: "http://127.0.0.1:8545"
    }
  },
  analytics: {
    enabled: true
  },
  mocha: {
    timeout: 20000
  }
};

export default defaultConfig;
