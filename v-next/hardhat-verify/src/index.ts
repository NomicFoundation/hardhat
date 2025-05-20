import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";
import verifyBlockscoutTask from "./internal/tasks/verify/blockscout/index.js";
import verifyEtherscanTask from "./internal/tasks/verify/etherscan/index.js";
import verifyTask from "./internal/tasks/verify/index.js";
import verifySourcifyTask from "./internal/tasks/verify/sourcify/index.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-verify",
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
  },
  tasks: [
    verifyTask,
    verifyEtherscanTask,
    verifySourcifyTask,
    verifyBlockscoutTask,
  ],
  npmPackage: "@nomicfoundation/hardhat-verify",
};

export default hardhatPlugin;
