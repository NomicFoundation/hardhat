import { getConfig } from "../core/config";
import { getEnvBuidlerArguments } from "../core/params/env-variables";
import { BUIDLER_PARAM_DEFINITIONS } from "../core/params/buidler-params";
import { createEnvironment } from "../core/env/definition";

let env;

const globalWithEnv = global as NodeJS.Global & { env: any };

if (globalWithEnv.env !== undefined) {
  env = globalWithEnv.env;
} else {
  const config = getConfig();
  const buidlerArguments = getEnvBuidlerArguments(BUIDLER_PARAM_DEFINITIONS);
  env = createEnvironment(config, buidlerArguments);
}

// We export this in two different ways so that it works in CJS and ESM modules.
module.exports = env;
module.exports.default = env;
