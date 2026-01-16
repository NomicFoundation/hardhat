import type { PluginSafeTaskDefinition } from "hardhat/types/plugins";

import { task } from "hardhat/config";

import { extendWithSourcifyArgs, extendWithVerificationArgs } from "./utils.js";

const verifyTask: PluginSafeTaskDefinition = extendWithSourcifyArgs(
  extendWithVerificationArgs(
    task("verify", "Verify a contract on all supported explorers"),
  ),
)
  .setAction(() => import("./task-action.js"))
  .build();

export default verifyTask;
