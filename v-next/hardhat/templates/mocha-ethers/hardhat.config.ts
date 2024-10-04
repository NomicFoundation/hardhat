import type { HardhatUserConfig } from "@ignored/hardhat-vnext/types/config";

import HardhatMochaTestRunner from "@ignored/hardhat-vnext-mocha-test-runner";
import HardhatEthers from "@ignored/hardhat-vnext-ethers";
import HardhatNetworkHelpers from "@ignored/hardhat-vnext-network-helpers";

const config: HardhatUserConfig = {
  plugins: [HardhatMochaTestRunner, HardhatEthers, HardhatNetworkHelpers],
  solidity: "0.8.24",
};

export default config;
