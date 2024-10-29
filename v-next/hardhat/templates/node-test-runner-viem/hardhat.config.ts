import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import HardhatNodeTestRunner from "@ignored/hardhat-vnext-node-test-runner";
import HardhatViem from "@ignored/hardhat-vnext-viem";
import HardhatNetworkHelpers from "@ignored/hardhat-vnext-network-helpers";

const config: HardhatUserConfig = {
  plugins: [HardhatNodeTestRunner, HardhatViem, HardhatNetworkHelpers],
  solidity: "0.8.24",
  defaultNetwork: "hardhat",
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
