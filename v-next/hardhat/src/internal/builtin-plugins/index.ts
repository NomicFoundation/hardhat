import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import clean from "./clean/index.js";
import console from "./console/index.js";
import run from "./run/index.js";

// Note: When importing a plugin, you have to export its types, so that its
// type extensions, if any, also get loaded.
export type * from "./clean/index.js";
export type * from "./console/index.js";
export type * from "./hardhat-foo/index.js";
export type * from "./run/index.js";

export const builtinPlugins: HardhatPlugin[] = [clean, console, run];
