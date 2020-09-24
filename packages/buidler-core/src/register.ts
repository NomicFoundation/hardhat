import debug from "debug";

import { BuidlerContext } from "./internal/context";
import { loadConfigAndTasks } from "./internal/core/config/config-loading";
import { BUIDLER_PARAM_DEFINITIONS } from "./internal/core/params/buidler-params";
import { getEnvHardhatArguments } from "./internal/core/params/env-variables";
import { Environment } from "./internal/core/runtime-environment";
import { loadTsNodeIfPresent } from "./internal/core/typescript-support";
import {
  disableReplWriterShowProxy,
  isNodeCalledWithoutAScript,
} from "./internal/util/console";

if (!BuidlerContext.isCreated()) {
  // tslint:disable-next-line no-var-requires
  require("source-map-support/register");

  const ctx = BuidlerContext.createBuidlerContext();

  if (isNodeCalledWithoutAScript()) {
    disableReplWriterShowProxy();
  }

  loadTsNodeIfPresent();

  const hardhatArguments = getEnvHardhatArguments(
    BUIDLER_PARAM_DEFINITIONS,
    process.env
  );

  if (hardhatArguments.verbose) {
    debug.enable("buidler*");
  }

  const config = loadConfigAndTasks(hardhatArguments);

  const env = new Environment(
    config,
    hardhatArguments,
    ctx.tasksDSL.getTaskDefinitions(),
    ctx.extendersManager.getExtenders(),
    ctx.experimentalHardhatEVMMessageTraceHooks
  );

  ctx.setBuidlerRuntimeEnvironment(env);

  env.injectToGlobal();
}
