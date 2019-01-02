import { loadConfigAndTasks } from "../core/config/config-loading";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { Environment } from "../core/runtime-environment";
import { BuidlerRuntimeEnvironment } from "../types";

type BuidlerWithEnvironment = NodeJS.Global & {
  env?: BuidlerRuntimeEnvironment;
};

let env: BuidlerRuntimeEnvironment;
const globalWithEnv = global as BuidlerWithEnvironment;

if (globalWithEnv.env !== undefined) {
  env = globalWithEnv.env;
} else {
  const buidlerArguments = getEnvBuidlerArguments(
    BUIDLER_PARAM_DEFINITIONS,
    process.env
  );

  const [config, taskDefinitions] = loadConfigAndTasks(buidlerArguments.config);

  env = new Environment(config, buidlerArguments, taskDefinitions);
}

// TODO: Find out a way to export this as a CJS module.
export default env;
