import type { Keystore as KeystoreI } from "../types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import {
  addSecretToKeystore,
  decryptSecret,
  doesKeyExist,
  removeSecretFromKeystore,
  type EncryptedKeystore,
} from "./encryption.js";

export class Keystore implements KeystoreI {
  #keystoreData: EncryptedKeystore;

  constructor(keystoreData: EncryptedKeystore) {
    this.#keystoreData = keystoreData;
  }

  public toJSON(): EncryptedKeystore {
    return this.#keystoreData;
  }

  public async listUnverifiedKeys(): Promise<string[]> {
    // In this scenario the keystore is not validated for integrity, so the returned keys might have been tampered with.
    // This is acceptable if the keys are only listed for display purposes.
    // This risk is considered acceptable for this use case.
    return Object.keys(this.#keystoreData.secrets);
  }

  public async hasKey(key: string, masterKey: Uint8Array): Promise<boolean> {
    return doesKeyExist({
      masterKey,
      encryptedKeystore: this.#keystoreData,
      key,
    });
  }

  public async readValue(key: string, masterKey: Uint8Array): Promise<string> {
    assertHardhatInvariant(
      key in this.#keystoreData.secrets,
      "Unknown key should never be read",
    );

    return decryptSecret({
      masterKey,
      encryptedKeystore: this.#keystoreData,
      key,
    });
  }

  public async removeKey(key: string, masterKey: Uint8Array): Promise<void> {
    assertHardhatInvariant(
      key in this.#keystoreData.secrets,
      "Unknown key should never be removed",
    );

    this.#keystoreData = removeSecretFromKeystore({
      masterKey,
      encryptedKeystore: this.#keystoreData,
      keyToRemove: key,
    });
  }

  public async addNewValue(
    key: string,
    value: string,
    masterKey: Uint8Array,
  ): Promise<void> {
    this.#keystoreData = addSecretToKeystore({
      masterKey,
      encryptedKeystore: this.#keystoreData,
      key,
      value,
    });
  }
}
