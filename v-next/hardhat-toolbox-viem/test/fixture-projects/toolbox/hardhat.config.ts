import type { HardhatUserConfig } from "hardhat/types/config";

// eslint-disable-next-line import/no-relative-packages -- allow in fixture projects
import hardhatToolboxViemPlugin from "../../../src/index.js";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
};

export default config;
