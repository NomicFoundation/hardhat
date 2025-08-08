import type { NewTaskDefinition } from "hardhat/types/tasks";

import { task } from "hardhat/config";

import { extendWithVerificationArgs } from "./utils.js";

const verifyTask: NewTaskDefinition = extendWithVerificationArgs(
  task("verify", "Verify a contract on all supported explorers"),
)
  .setAction({
    action: () => import("./task-action.js"),
  })
  .build();

export default verifyTask;
