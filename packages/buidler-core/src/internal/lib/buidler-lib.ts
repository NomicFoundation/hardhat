import { BuidlerRuntimeEnvironment } from "../../types";
import { BuidlerContext } from "../context";
import { loadConfigAndTasks } from "../core/config/config-loading";
import { BuidlerError, ERRORS } from "../core/errors";
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
  const config = loadConfigAndTasks(buidlerArguments.config);

  env = new Environment(
    config,
    buidlerArguments,
    ctx.tasksDSL.getTaskDefinitions(),
    ctx.extendersManager.getExtenders()
  );

  ctx.setBuidlerRuntimeEnvironment(env);
}

export = env;
