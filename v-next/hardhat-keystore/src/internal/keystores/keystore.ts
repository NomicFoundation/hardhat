import type { Keystore as KeystoreI } from "../types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import {
  addSecretToKeystore,
  decryptSecret,
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

  public async listKeys(): Promise<string[]> {
    return Object.keys(this.#keystoreData.secrets);
  }

  public async hasKey(key: string): Promise<boolean> {
    return Object.keys(this.#keystoreData.secrets).includes(key);
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
