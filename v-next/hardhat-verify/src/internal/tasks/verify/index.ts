import type { NewTaskDefinition } from "hardhat/types/tasks";

import { task } from "hardhat/config";

import { extendWithSourcifyArgs, extendWithVerificationArgs } from "./utils.js";

const verifyTask: NewTaskDefinition = extendWithSourcifyArgs(
  extendWithVerificationArgs(
    task("verify", "Verify a contract on all supported explorers"),
  ),
)
  .setAction(() => import("./task-action.js"))
  .build();

export default verifyTask;
