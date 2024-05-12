import { HardhatPlugin } from "../../types/plugins.js";
import builtinFunctionality from "../builtin-functionality.js";
import { reverseTopologicalSort } from "./sort.js";

/**
 * Resolves the plugin list, returning them in the right order, including the
 * builtin plugins.
 */
export function resolvePluginList(
  userConfigPluginList: HardhatPlugin[] = [],
): HardhatPlugin[] {
  return reverseTopologicalSort([
    builtinFunctionality,
    ...userConfigPluginList,
  ]);
}
