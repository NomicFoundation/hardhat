import type { HardhatPlugin } from "../../types/plugins.js";

import artifacts from "./artifacts/index.js";
import clean from "./clean/index.js";
import console from "./console/index.js";
import networkManager from "./network-manager/index.js";
import run from "./run/index.js";
import solidity from "./solidity/index.js";

// Note: When importing a plugin, you have to export its types, so that its
// type extensions, if any, also get loaded.
export type * from "./artifacts/index.js";
export type * from "./solidity/index.js";
export type * from "./network-manager/index.js";
export type * from "./clean/index.js";
export type * from "./console/index.js";
export type * from "./run/index.js";

export const builtinPlugins: HardhatPlugin[] = [
  artifacts,
  solidity,
  networkManager,
  clean,
  console,
  run,
];
