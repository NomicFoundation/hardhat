import type { NewTaskDefinition } from "hardhat/types/tasks";

import { task } from "hardhat/config";

import { extendWithVerificationArgs } from "../utils.js";

const verifyEtherscanTask: NewTaskDefinition = extendWithVerificationArgs(
  task(["verify", "etherscan"], "Verify a contract on Etherscan"),
)
  .setAction(import.meta.resolve("./task-action.js"))
  .build();

export default verifyEtherscanTask;
