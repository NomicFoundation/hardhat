import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import hardhatFoo from "./hardhat-foo/index.js";
import run from "./run/index.js";

// Note: When importing a plugin, you have to export its types, so that its
// type extensions, if any, also get loaded.
export type * from "./hardhat-foo/index.js";
export type * from "./run/index.js";

export const builtinPlugins: HardhatPlugin[] = [hardhatFoo, run];
