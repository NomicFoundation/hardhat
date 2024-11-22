import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import hardhatEthersPlugin from "@ignored/hardhat-vnext-ethers";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
  },
  paths: {
    // TODO: remove this when compilation in V3 is executed only when files are not compiled already (when cache is available)
    artifacts: "./artifacts",
  },
  plugins: [hardhatEthersPlugin],
};

export default config;
