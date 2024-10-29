import {
  HardhatUserConfig,
  configVariable,
} from "@ignored/hardhat-vnext/config";

import HardhatMochaTestRunner from "@ignored/hardhat-vnext-mocha-test-runner";
import HardhatEthers from "@ignored/hardhat-vnext-ethers";
import HardhatNetworkHelpers from "@ignored/hardhat-vnext-network-helpers";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaTestRunner, HardhatEthers, HardhatNetworkHelpers],
  solidity: {
    version: "0.8.24",
    remappings: [
      // This is necessary because most people import forge-std/Test.sol, and not forge-std/src/Test.sol.
      // This will improve in the future to remove the need for a named version.
      "forge-std/=npm/forge-std@1.9.4/src/",
    ],
  },
  networks: {
    edrOp: {
      type: "edr",
      chainId: 10,
      chainType: "optimism",
      forkConfig: {
        jsonRpcUrl: "https://mainnet.optimism.io",
      },
    },
  },
};

export default config;
