import type { UnencryptedKeystoreFile } from "../types.js";

export function createUnencryptedKeystoreFile(): UnencryptedKeystoreFile {
  return {
    _format: "hh-unencrypted-keystore",
    version: 1,
    keys: {},
  };
}
