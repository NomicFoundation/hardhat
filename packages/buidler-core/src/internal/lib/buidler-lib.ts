import debug from "debug";

import { HardhatRuntimeEnvironment } from "../../types";
import { BuidlerContext } from "../context";
import { loadConfigAndTasks } from "../core/config/config-loading";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { getEnvHardhatArguments } from "../core/params/env-variables";
import { Environment } from "../core/runtime-environment";

let ctx: BuidlerContext;
let env: HardhatRuntimeEnvironment;

if (BuidlerContext.isCreated()) {
  ctx = BuidlerContext.getBuidlerContext();

  // The most probable reason for this to happen is that this file was imported
  // from the config file
  if (ctx.environment === undefined) {
    throw new HardhatError(ERRORS.GENERAL.LIB_IMPORTED_FROM_THE_CONFIG);
  }

  env = ctx.environment;
} else {
  ctx = BuidlerContext.createBuidlerContext();

  const hardhatArguments = getEnvHardhatArguments(
    BUIDLER_PARAM_DEFINITIONS,
    process.env
  );

  if (hardhatArguments.verbose) {
    debug.enable("hardhat*");
  }

  const config = loadConfigAndTasks(hardhatArguments);

  env = new Environment(
    config,
    hardhatArguments,
    ctx.tasksDSL.getTaskDefinitions(),
    ctx.extendersManager.getExtenders(),
    ctx.experimentalHardhatEVMMessageTraceHooks
  );

  ctx.setBuidlerRuntimeEnvironment(env);
}

export = env;
