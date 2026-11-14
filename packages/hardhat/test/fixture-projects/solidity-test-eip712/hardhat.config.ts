import HardhatSolidityPlugin from "../../../src/internal/builtin-plugins/solidity-test/index.js";
import { HardhatUserConfig } from "../../../src/types/config.js";

const config: HardhatUserConfig = {
  plugins: [HardhatSolidityPlugin],
  // User-defined value types need a compiler newer than Hardhat's default.
  solidity: "0.8.28",
};

export default config;
