import type { GlobalOptionDefinition } from "../../../types/arguments.js";

import { ArgumentType } from "../../../types/arguments.js";
import { globalOption } from "../../core/config.js";

/**
 * The `--network` global option, contributed by the network-manager plugin.
 *
 * Exported so the standalone hhu binary, which doesn't load the plugin, can
 * reuse the exact same definition instead of duplicating it.
 */
export const NETWORK_GLOBAL_OPTION: GlobalOptionDefinition = globalOption({
  name: "network",
  description: "The network to connect to",
  type: ArgumentType.STRING_WITHOUT_DEFAULT,
  defaultValue: undefined,
});
