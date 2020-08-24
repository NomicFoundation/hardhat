import chalk from "chalk";
import path from "path";

import { BuidlerArguments, ResolvedBuidlerConfig } from "../../../types";
import { BuidlerContext } from "../../context";
import { loadPluginFile } from "../plugins";
import { getUserConfigPath } from "../project-structure";

import { resolveConfig } from "./config-resolution";
import { validateConfig } from "./config-validation";
import { DEFAULT_SOLC_VERSION } from "./default-config";

function importCsjOrEsModule(filePath: string): any {
  const imported = require(filePath);
  return imported.default !== undefined ? imported.default : imported;
}

export function loadConfigAndTasks(
  buidlerArguments?: Partial<BuidlerArguments>
): ResolvedBuidlerConfig {
  let configPath =
    buidlerArguments !== undefined ? buidlerArguments.config : undefined;

  if (configPath === undefined) {
    configPath = getUserConfigPath();
  } else {
    if (!path.isAbsolute(configPath)) {
      configPath = path.join(process.cwd(), configPath);
      configPath = path.normalize(configPath);
    }
  }

  // Before loading the builtin tasks, the default and user's config we expose
  // the config env in the global object.
  const configEnv = require("./config-env");

  const globalAsAny: any = global;

  Object.entries(configEnv).forEach(
    ([key, value]) => (globalAsAny[key] = value)
  );

  loadPluginFile(path.join(__dirname, "..", "tasks", "builtin-tasks"));

  const defaultConfig = importCsjOrEsModule("./default-config");
  const userConfig = importCsjOrEsModule(configPath);
  validateConfig(userConfig);

  if (userConfig.solidity === undefined) {
    console.warn(
      chalk.yellow(
        `Solidity compiler is not configured. Version ${DEFAULT_SOLC_VERSION} will be used by default. Add a 'solidity' entry to your configuration to supress this warning.`
      )
    );
  }

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(configEnv).forEach((key) => (globalAsAny[key] = undefined));

  const resolved = resolveConfig(
    configPath,
    defaultConfig,
    userConfig,
    BuidlerContext.getBuidlerContext().configExtenders
  );

  return resolved;
}
