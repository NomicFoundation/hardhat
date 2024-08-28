import { HardhatPluginError } from "@ignored/hardhat-vnext-errors";

import { PLUGIN_ID } from "../constants.js";

export function assertFilePath(
  fileP: string | undefined,
): asserts fileP is string {
  if (fileP === undefined) {
    throw new HardhatPluginError(
      PLUGIN_ID,
      "The filePath should be available at this point!",
    );
  }
}
