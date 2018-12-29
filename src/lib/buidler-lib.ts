import { getConfig } from "../core/config/config-loading";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { BuidlerRuntimeEnvironment } from "../core/runtime-environment";
import { GlobalWithBuidlerRuntimeEnvironment } from "../types";

let env: BuidlerRuntimeEnvironment;
const globalWithEnv = global as GlobalWithBuidlerRuntimeEnvironment;

if (globalWithEnv.env !== undefined) {
  env = globalWithEnv.env;
} else {
  const buidlerArguments = getEnvBuidlerArguments(
    BUIDLER_PARAM_DEFINITIONS,
    process.env
  );

  const [config, taskDefinitions] = getConfig(buidlerArguments.config);

  env = new BuidlerRuntimeEnvironment(
    config,
    buidlerArguments,
    taskDefinitions
  );
}

// TODO: Find out a way to export this as a CJS module.
export default env;
