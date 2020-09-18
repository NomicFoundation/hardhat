import debug from "debug";

import { BuidlerRuntimeEnvironment } from "../../types";
import { BuidlerContext } from "../context";
import { loadConfigAndTasks } from "../core/config/config-loading";
import { BuidlerError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { Environment } from "../core/runtime-environment";

let ctx: BuidlerContext;
let env: BuidlerRuntimeEnvironment;

if (BuidlerContext.isCreated()) {
  ctx = BuidlerContext.getBuidlerContext();

  // The most probable reason for this to happen is that this file was imported
  // from the config file
  if (ctx.environment === undefined) {
    throw new BuidlerError(ERRORS.GENERAL.LIB_IMPORTED_FROM_THE_CONFIG);
  }

  env = ctx.environment;
} else {
  ctx = BuidlerContext.createBuidlerContext();

  const buidlerArguments = getEnvBuidlerArguments(
    BUIDLER_PARAM_DEFINITIONS,
    process.env
  );

  if (buidlerArguments.verbose) {
    debug.enable("buidler*");
  }

  const config = loadConfigAndTasks(buidlerArguments);

  // TODO: This is here for backwards compatibility.
  // There are very few projects using this.
  if (buidlerArguments.network === undefined) {
    buidlerArguments.network = config.defaultNetwork;
  }

  env = new Environment(
    config,
    buidlerArguments,
    ctx.tasksDSL.getTaskDefinitions(),
    ctx.extendersManager.getExtenders(),
    ctx.experimentalBuidlerEVMMessageTraceHooks
  );

  ctx.setBuidlerRuntimeEnvironment(env);
}

export = env;
