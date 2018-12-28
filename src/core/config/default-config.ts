import path from "path";

import { BuidlerConfig } from "../../types";
import { getProjectRoot, getUserConfigPath } from "../project-structure";

const projectRoot = getProjectRoot();

const defaultConfig: BuidlerConfig = {
  paths: {
    root: projectRoot,
    configFile: getUserConfigPath(),
    sources: path.join(projectRoot, "contracts"),
    cache: path.join(projectRoot, "cache"),
    artifacts: path.join(projectRoot, "artifacts")
  },
  solc: {
    version: require("solc/package.json").version,
    optimizer: {
      enabled: false,
      runs: 200
    }
  },
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 8545
    },
    auto: {
      blockGasLimit: 7500000,
      accounts: [
        // You can set-up accounts here like this:
        // {
        //   privateKey:
        //     "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200",
        //   balance: 1000000000000000000000000
        // }
      ]
    }
  },
  mocha: {}
};

export default defaultConfig;
