import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";
import verifyEtherscanTask from "./internal/tasks/verify/etherscan/index.js";
import verifyTask from "./internal/tasks/verify/index.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-verify",
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
  },
  tasks: [verifyTask, verifyEtherscanTask],
  npmPackage: "@nomicfoundation/hardhat-verify",
};

export default hardhatPlugin;
