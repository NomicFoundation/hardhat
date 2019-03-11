import * as path from "path";

import { ResolvedBuidlerConfig } from "../../../types";
import { getUserConfigPath } from "../project-structure";

import { resolveConfig } from "./config-resolution";

function importCsjOrEsModule(filePath: string): any {
  const imported = require(filePath);
  return imported.default !== undefined ? imported.default : imported;
}

export function loadConfigAndTasks(configPath?: string): ResolvedBuidlerConfig {
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

  require("../tasks/builtin-tasks");

  const defaultConfig = importCsjOrEsModule("./default-config");
  const userConfig = importCsjOrEsModule(configPath);

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(configEnv).forEach(key => (globalAsAny[key] = undefined));

  const config = resolveConfig(configPath, defaultConfig, userConfig);

  return config;
}
