import { getConfig } from "../core/config";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { GlobalWithBuidlerRuntimeEnvironment } from "../types";
import { BuidlerRuntimeEnvironment } from "../core/runtime-environment";

let env: BuidlerRuntimeEnvironment;
const globalWithEnv = global as GlobalWithBuidlerRuntimeEnvironment;

if (globalWithEnv.env !== undefined) {
  env = globalWithEnv.env;
} else {
  const [config, taskDefinitions] = getConfig();
  const buidlerArguments = getEnvBuidlerArguments(
    BUIDLER_PARAM_DEFINITIONS,
    process.env
  );
  env = new BuidlerRuntimeEnvironment(
    config,
    buidlerArguments,
    taskDefinitions
  );
}

// TODO: Find out a way to export this as a CJS module.
export default env;
