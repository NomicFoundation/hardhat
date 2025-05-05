// NOTE: We import the builtin plugins in this module, so that their
// type-extensions are loaded when the user imports `hardhat/hre`.
import "./internal/builtin-plugins/index.js";

export { resolveHardhatConfigPath } from "./internal/config-loading.js";
export { createHardhatRuntimeEnvironment } from "./internal/hre-initialization.js";
