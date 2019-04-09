import { BuidlerRuntimeEnvironment } from "../../types";
import { BuidlerContext } from "../context";
import { loadConfigAndTasks } from "../core/config/config-loading";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { Environment } from "../core/runtime-environment";

let env: BuidlerRuntimeEnvironment;

if (!BuidlerContext.isCreated()) {
  BuidlerContext.createBuidlerContext();
}
const ctx: BuidlerContext = BuidlerContext.getBuidlerContext();

if (ctx.environment !== undefined) {
  env = ctx.environment;
} else {
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

// TODO: Find out a way to export this as a CJS module.
export = env;
