import type { HardhatPlugin } from "@nomicfoundation/hardhat-core/types/plugins";

import hardhatFoo from "./hardhat-foo/index.js";
import run from "./run/index.js";

export const builtinPlugins: HardhatPlugin[] = [hardhatFoo, run];
