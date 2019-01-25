import { loadConfigAndTasks } from "./internal/core/config/config-loading";
import { BUIDLER_PARAM_DEFINITIONS } from "./internal/core/params/buidler-params";
import { getEnvBuidlerArguments } from "./internal/core/params/env-variables";
import { Environment } from "./internal/core/runtime-environment";

const globalAsAny = global as any;

if (globalAsAny.env === undefined) {
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
