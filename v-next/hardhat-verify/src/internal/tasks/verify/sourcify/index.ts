import type { PluginTaskDefinition } from "hardhat/types/plugins";

import { task } from "hardhat/config";

import {
  extendWithSourcifyArgs,
  extendWithVerificationArgs,
} from "../utils.js";

const verifySourcifyTask: PluginTaskDefinition = extendWithSourcifyArgs(
  extendWithVerificationArgs(
    task(["verify", "sourcify"], "Verify a contract on Sourcify"),
  ),
  false,
)
  .setAction(() => import("./task-action.js"))
  .build();

export default verifySourcifyTask;
