import type { NewTaskDefinitionPlugin } from "hardhat/types/tasks";

import { task } from "hardhat/config";

import { extendWithVerificationArgs } from "../utils.js";

const verifyEtherscanTask: NewTaskDefinitionPlugin = extendWithVerificationArgs(
  task(["verify", "etherscan"], "Verify a contract on Etherscan"),
)
  .setAction(() => import("./task-action.js"))
  .build();

export default verifyEtherscanTask;
