export type * from "./internal/core/config.js";
export * from "./internal/core/config.js";

export type { HardhatUserConfig } from "./types/config.js";

// NOTE: We import the builtin plugins in this module, so that their
// type-extensions are loaded when the user imports `hardhat/config`.
import "./internal/builtin-plugins/index.js";
