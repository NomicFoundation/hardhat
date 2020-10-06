import chalk from "chalk";
import path from "path";

import { HardhatArguments, ResolvedHardhatConfig } from "../../../types";
import { HardhatContext } from "../../context";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";
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
  hardhatArguments?: Partial<HardhatArguments>,
  { showWarningIfNoSolidityConfig } = { showWarningIfNoSolidityConfig: true }
): ResolvedHardhatConfig {
  let configPath =
    hardhatArguments !== undefined ? hardhatArguments.config : undefined;

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

  const ctx = HardhatContext.getHardhatContext();
  ctx.setConfigPath(configPath);

  loadPluginFile(path.join(__dirname, "..", "tasks", "builtin-tasks"));

  const userConfig = importCsjOrEsModule(configPath);
  validateConfig(userConfig);

  if (userConfig.solidity === undefined && showWarningIfNoSolidityConfig) {
    console.warn(
      chalk.yellow(
        `Solidity compiler is not configured. Version ${DEFAULT_SOLC_VERSION} will be used by default. Add a 'solidity' entry to your configuration to supress this warning.

Learn more about compiler configuration at https://usehardhat.com/configuration"
`
      )
    );
  }

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(configEnv).forEach((key) => (globalAsAny[key] = undefined));

  const frozenUserConfig = deepFreezeUserConfig(userConfig);

  // Deep clone?
  const resolved = resolveConfig(configPath, frozenUserConfig);

  for (const extender of HardhatContext.getHardhatContext().configExtenders) {
    extender(resolved, frozenUserConfig);
  }

  return resolved;
}

function deepFreezeUserConfig(
  config: any,
  propertyPath: Array<string | number | symbol> = []
) {
  if (typeof config !== "object" || config === null) {
    return config;
  }

  return new Proxy(config, {
    get(target: any, property: string | number | symbol, receiver: any): any {
      return deepFreezeUserConfig(Reflect.get(target, property, receiver), [
        ...propertyPath,
        property,
      ]);
    },

    set(
      target: any,
      property: string | number | symbol,
      value: any,
      receiver: any
    ): boolean {
      throw new HardhatError(ERRORS.GENERAL.USER_CONFIG_MODIFIED, {
        path: [...propertyPath, property]
          .map((pathPart) => pathPart.toString())
          .join("."),
      });
    },
  });
}
