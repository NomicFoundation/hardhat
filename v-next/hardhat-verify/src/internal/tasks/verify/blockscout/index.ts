import type { NewTaskDefinition } from "hardhat/types/tasks";

import { task } from "hardhat/config";

import { extendWithVerificationArgs } from "../utils.js";

const verifyBlockscoutTask: NewTaskDefinition = extendWithVerificationArgs(
  task(["verify", "blockscout"], "Verify a contract on Blockscout"),
)
  .setAction(import.meta.resolve("./task-action.js"))
  .build();

export default verifyBlockscoutTask;
