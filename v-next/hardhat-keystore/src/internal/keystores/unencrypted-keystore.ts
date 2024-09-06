import type { Keystore, UnencryptedKeystoreFile } from "../types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

export class UnencryptedKeystore implements Keystore {
  readonly #keystoreData: UnencryptedKeystoreFile;

  constructor(keystoreData: UnencryptedKeystoreFile) {
    this.#keystoreData = keystoreData;
  }

  public static createEmptyUnencryptedKeystoreFile(): UnencryptedKeystoreFile {
    return {
      _format: "hh-unencrypted-keystore",
      version: 1,
      keys: {},
    };
  }

  public toJSON(): UnencryptedKeystoreFile {
    return this.#keystoreData;
  }

  public async listKeys(): Promise<string[]> {
    return Object.keys(this.#keystoreData.keys);
  }

  public async hasKey(key: string): Promise<boolean> {
    return Object.keys(this.#keystoreData.keys).includes(key);
  }

  public async readValue(key: string): Promise<string> {
    const value = this.#keystoreData.keys[key];

    assertHardhatInvariant(
      value !== undefined,
      "Unknown key should never be read",
    );

    return value;
  }

  public async removeKey(key: string): Promise<void> {
    delete this.#keystoreData.keys[key];
  }

  public async addNewValue(key: string, value: string): Promise<void> {
    this.#keystoreData.keys[key] = value;
  }
}
