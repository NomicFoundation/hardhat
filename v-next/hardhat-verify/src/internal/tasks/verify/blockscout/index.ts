import type { NewTaskDefinitionPlugin } from "hardhat/types/tasks";

import { task } from "hardhat/config";

import { extendWithVerificationArgs } from "../utils.js";

const verifyBlockscoutTask: NewTaskDefinitionPlugin =
  extendWithVerificationArgs(
    task(["verify", "blockscout"], "Verify a contract on Blockscout"),
  )
    .setAction(() => import("./task-action.js"))
    .build();

export default verifyBlockscoutTask;
