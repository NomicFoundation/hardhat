import type { NewTaskDefinition } from "hardhat/types/tasks";

import { task } from "hardhat/config";

import { extendWithVerificationArgs } from "../utils.js";

const verifySourcifyTask: NewTaskDefinition = extendWithVerificationArgs(
  task(["verify", "sourcify"], "Verify a contract on Sourcify"),
)
  .setAction(import.meta.resolve("./task-action.js"))
  .build();

export default verifySourcifyTask;
