import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import HardhatNodeTestRunner from "@ignored/hardhat-vnext-node-test-runner";
import HardhatViem from "@ignored/hardhat-vnext-viem";
import HardhatNetworkHelpers from "@ignored/hardhat-vnext-network-helpers";
import HardhatKeystore from "@ignored/hardhat-vnext-keystore";

const config: HardhatUserConfig = {
  plugins: [
    HardhatNodeTestRunner,
    HardhatViem,
    HardhatNetworkHelpers,
    HardhatKeystore,
  ],
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
