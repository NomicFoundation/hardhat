import type { GlobalParametersMap } from "./global-parameters.js";
import type { HardhatPlugin } from "./plugins.js";

/**
 * An object that contains options to bypass some initialization, to avoid
 * redoing it in the CLI. Should only be used in the official CLI.
 */
export interface UnsafeHardhatRuntimeEnvironmentOptions {
  resolvedPlugins?: HardhatPlugin[];
  globalParametersMap?: GlobalParametersMap;
}
