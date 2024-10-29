import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import HardhatNodeTestRunner from "@ignored/hardhat-vnext-node-test-runner";
import HardhatViem from "@ignored/hardhat-vnext-viem";
import HardhatNetworkHelpers from "@ignored/hardhat-vnext-network-helpers";

const config: HardhatUserConfig = {
  plugins: [HardhatNodeTestRunner, HardhatViem, HardhatNetworkHelpers],
  solidity: {
    version: "0.8.24",
    remappings: [
      // This is necessary because most people import forge-std/Test.sol, and not forge-std/src/Test.sol.
      // This will improve in the future to remove the need for a named version.
      "forge-std/=npm/forge-std@1.9.4/src/",
    ],
  },
  networks: {
    "local-base": {
      chainId: 8453,
      type: "edr",
      chainType: "optimism",
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1,
    },
  },
};

export default config;
