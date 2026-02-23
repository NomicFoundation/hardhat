import type { NewTaskDefinition } from "hardhat/types/tasks";

import { task } from "hardhat/config";

import {
  extendWithSourcifyArgs,
  extendWithVerificationArgs,
} from "../utils.js";

const verifySourcifyTask: NewTaskDefinition = extendWithSourcifyArgs(
  extendWithVerificationArgs(
    task(["verify", "sourcify"], "Verify a contract on Sourcify"),
  ),
  false,
)
  .setAction(() => import("./task-action.js"))
  .build();

export default verifySourcifyTask;
