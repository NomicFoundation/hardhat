import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import hardhatEthersPlugin from "@ignored/hardhat-vnext-ethers";

const config: HardhatUserConfig = {
  plugins: [hardhatEthersPlugin],
};

export default config;
