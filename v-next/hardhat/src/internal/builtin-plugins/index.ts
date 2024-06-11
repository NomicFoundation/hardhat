import type { HardhatPlugin } from "@nomicfoundation/hardhat-core/types/plugins";

import hardhatFoo from "./hardhat-foo/index.js";

export const builtinPlugins: HardhatPlugin[] = [hardhatFoo];
