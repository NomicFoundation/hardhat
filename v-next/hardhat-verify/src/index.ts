import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";
import verifyBlockscoutTask from "./internal/tasks/verify/blockscout/index.js";
import verifyEtherscanTask from "./internal/tasks/verify/etherscan/index.js";
import verifyTask from "./internal/tasks/verify/index.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-verify",
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
  },
  tasks: [verifyTask, verifyBlockscoutTask, verifyEtherscanTask],
  npmPackage: "@nomicfoundation/hardhat-verify",
};

export default hardhatPlugin;
