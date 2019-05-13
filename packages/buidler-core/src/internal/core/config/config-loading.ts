import * as path from "path";

import { ResolvedBuidlerConfig } from "../../../types";
import { BuidlerContext } from "../../context";
import { loadPluginFile } from "../plugins";
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

  // This is a horrible hack that deserves an explanation.
  //   - config files can execute the usePlugin function, which is imported
  //     from config.ts.
  //   - There's no way to pass it arguments.
  //   - Internally, usePlugin calls require, which should use the same
  //     node_module's paths than the Buidler project.
  //   - Except that it doesn't when we are linking Buidler for local tests.
  //   - node resolves symlinks before loading modules, so imports from
  //     Buidler files are run in this context, not inside the Buidler project.
  //   - We solve this by using require.resolve and specifying the paths,
  //     but we need the config path in order to do so.
  //   - We set the config path into the BuidlerContext and cry a little 😢
  const ctx = BuidlerContext.getBuidlerContext();
  ctx.configPath = configPath;

  loadPluginFile(__dirname + "/../tasks/builtin-tasks");

  const defaultConfig = importCsjOrEsModule("./default-config");
  const userConfig = importCsjOrEsModule(configPath);

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(configEnv).forEach(key => (globalAsAny[key] = undefined));

  return resolveConfig(configPath, defaultConfig, userConfig);
}
