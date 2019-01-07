import { BuidlerRuntimeEnvironment } from "../../types";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { loadConfigAndTasks } from "../core/config/config-loading";
import { Environment } from "../core/runtime-environment";

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
export = env;
