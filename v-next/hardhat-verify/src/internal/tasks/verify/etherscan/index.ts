import type { PluginSafeTaskDefinition } from "hardhat/types/plugins";

import { task } from "hardhat/config";

import { extendWithVerificationArgs } from "../utils.js";

const verifyEtherscanTask: PluginSafeTaskDefinition =
  extendWithVerificationArgs(
    task(["verify", "etherscan"], "Verify a contract on Etherscan"),
  )
    .setAction(() => import("./task-action.js"))
    .build();

export default verifyEtherscanTask;
