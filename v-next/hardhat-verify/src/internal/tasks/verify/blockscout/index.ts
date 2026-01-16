import type { PluginSafeTaskDefinition } from "hardhat/types/plugins";

import { task } from "hardhat/config";

import { extendWithVerificationArgs } from "../utils.js";

const verifyBlockscoutTask: PluginSafeTaskDefinition =
  extendWithVerificationArgs(
    task(["verify", "blockscout"], "Verify a contract on Blockscout"),
  )
    .setAction(() => import("./task-action.js"))
    .build();

export default verifyBlockscoutTask;
