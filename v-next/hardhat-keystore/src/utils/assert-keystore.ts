import type { Keystore } from "../types.js";

import { HardhatPluginError } from "@ignored/hardhat-vnext-errors";

import { PLUGIN_ID } from "../constants.js";

export function assertKeyStore(
  keystore: Keystore | undefined,
): asserts keystore is Keystore {
  if (keystore === undefined) {
    throw new HardhatPluginError(
      PLUGIN_ID,
      "The keystore should be available at this point!",
    );
  }
}
