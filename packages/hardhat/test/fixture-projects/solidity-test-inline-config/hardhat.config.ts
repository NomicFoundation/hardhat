import HardhatSolidityPlugin from "../../../src/internal/builtin-plugins/solidity-test/index.js";
import { HardhatUserConfig } from "../../../src/types/config.js";

const config: HardhatUserConfig = {
  plugins: [HardhatSolidityPlugin],
};

export default config;
