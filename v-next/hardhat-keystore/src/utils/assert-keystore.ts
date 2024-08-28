import type { KeystoreFile } from "../types.js";

import { HardhatPluginError } from "@ignored/hardhat-vnext-errors";

import { PLUGIN_ID } from "../constants.js";

export function assertKeyStore(
  keystore: KeystoreFile | undefined,
): asserts keystore is KeystoreFile {
  if (keystore === undefined) {
    throw new HardhatPluginError(
      PLUGIN_ID,
      "The keystore should be available at this point!",
    );
  }
}
