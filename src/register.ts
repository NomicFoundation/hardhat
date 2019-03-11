import { loadConfigAndTasks } from "./internal/core/config/config-loading";
import { BUIDLER_PARAM_DEFINITIONS } from "./internal/core/params/buidler-params";
import { getEnvBuidlerArguments } from "./internal/core/params/env-variables";
import { Environment } from "./internal/core/runtime-environment";
import { loadTsNodeIfPresent } from "./internal/core/typescript-support";
import {
  disableReplWriterShowProxy,
  isNodeCalledWithoutAScript
} from "./internal/util/console";

const globalAsAny = global as any;

if (globalAsAny.env === undefined) {
  // tslint:disable-next-line no-var-requires
  require("source-map-support/register");

  if (isNodeCalledWithoutAScript()) {
    disableReplWriterShowProxy();
  }

  loadTsNodeIfPresent();

  const buidlerArguments = getEnvBuidlerArguments(
    BUIDLER_PARAM_DEFINITIONS,
    process.env
  );

  const [config, taskDefinitions, envExtenders] = loadConfigAndTasks(
    buidlerArguments.config
  );

  const env = new Environment(
    config,
    buidlerArguments,
    taskDefinitions,
    envExtenders
  );

  env.injectToGlobal();
}
