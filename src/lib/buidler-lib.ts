import { getConfig } from "../core/config";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { createEnvironment } from "../core/env/definition";
import {
  BuidlerRuntimeEnvironment,
  GlobalWithBuidlerRuntimeEnvironment
} from "../types";

let env: BuidlerRuntimeEnvironment;

const globalWithEnv = global as GlobalWithBuidlerRuntimeEnvironment;

if (globalWithEnv.env !== undefined) {
  env = globalWithEnv.env;
} else {
  const config = getConfig();
  const buidlerArguments = getEnvBuidlerArguments(BUIDLER_PARAM_DEFINITIONS);
  env = createEnvironment(config, buidlerArguments);
}

// TODO: Find out a way to export this as a CJS module.
export default env;
