import type { PluginTaskDefinition } from "hardhat/types/plugins";

import { task } from "hardhat/config";

import { extendWithSourcifyArgs, extendWithVerificationArgs } from "./utils.js";

const verifyTask: PluginTaskDefinition = extendWithSourcifyArgs(
  extendWithVerificationArgs(
    task("verify", "Verify a contract on all supported explorers"),
  ),
)
  .setLazyAction(() => import("./task-action.js"))
  .build();

export default verifyTask;
