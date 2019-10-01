import debug from "debug";

import { BuidlerContext } from "./internal/context";
import { loadConfigAndTasks } from "./internal/core/config/config-loading";
import { BUIDLER_PARAM_DEFINITIONS } from "./internal/core/params/buidler-params";
import { getEnvBuidlerArguments } from "./internal/core/params/env-variables";
import { Environment } from "./internal/core/runtime-environment";
import { loadTsNodeIfPresent } from "./internal/core/typescript-support";
import {
  disableReplWriterShowProxy,
  isNodeCalledWithoutAScript
} from "./internal/util/console";

if (!BuidlerContext.isCreated()) {
  // tslint:disable-next-line no-var-requires
  require("source-map-support/register");

  const ctx = BuidlerContext.createBuidlerContext();

  if (isNodeCalledWithoutAScript()) {
    disableReplWriterShowProxy();
  }

  loadTsNodeIfPresent();

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

  const env = new Environment(
    config,
    buidlerArguments,
    ctx.tasksDSL.getTaskDefinitions(),
    ctx.extendersManager.getExtenders()
  );

  ctx.setBuidlerRuntimeEnvironment(env);

  env.injectToGlobal();
}
