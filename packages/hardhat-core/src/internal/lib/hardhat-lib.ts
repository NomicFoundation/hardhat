import debug from "debug";

import { HardhatRuntimeEnvironment } from "../../types";
import { HardhatContext } from "../context";
import { loadConfigAndTasks } from "../core/config/config-loading";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { getEnvHardhatArguments } from "../core/params/env-variables";
import { HARDHAT_PARAM_DEFINITIONS } from "../core/params/hardhat-params";
import { Environment } from "../core/runtime-environment";
import { applyWorkaround } from "../util/antlr-prototype-pollution-workaround";

let ctx: HardhatContext;
let env: HardhatRuntimeEnvironment;

applyWorkaround();

if (HardhatContext.isCreated()) {
  ctx = HardhatContext.getHardhatContext();

  // The most probable reason for this to happen is that this file was imported
  // from the config file
  if (ctx.environment === undefined) {
    throw new HardhatError(ERRORS.GENERAL.LIB_IMPORTED_FROM_THE_CONFIG);
  }

  env = ctx.environment;
} else {
  ctx = HardhatContext.createHardhatContext();

  const hardhatArguments = getEnvHardhatArguments(
    HARDHAT_PARAM_DEFINITIONS,
    process.env
  );

  if (hardhatArguments.verbose) {
    debug.enable("hardhat*");
  }

  const { resolvedConfig, userConfig } = loadConfigAndTasks(hardhatArguments);

  env = new Environment(
    resolvedConfig,
    hardhatArguments,
    ctx.tasksDSL.getTaskDefinitions(),
    ctx.extendersManager.getExtenders(),
    ctx.experimentalHardhatNetworkMessageTraceHooks,
    userConfig
  );

  ctx.setHardhatRuntimeEnvironment(env);
}

export = env;
