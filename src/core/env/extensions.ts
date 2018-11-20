import {
  BuidlerConfig,
  BuidlerRuntimeEnvironment,
  EnvironmentExtensionFunction
} from "../../types";

const extensions: EnvironmentExtensionFunction[] = [];

export function extendEnvironment(
  extensionFunction: EnvironmentExtensionFunction
) {
  extensions.push(extensionFunction);
}

export function applyExtensions(
  environment: BuidlerRuntimeEnvironment,
  config: BuidlerConfig
) {
  for (const extension of extensions) {
    extension(environment, config);
  }
}
