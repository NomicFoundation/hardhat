import type { Keystore, UnencryptedKeystoreFile } from "../types.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";

import { unencryptedKeystoreFileSchema } from "../types-validation.js";

import { createUnencryptedKeystoreFile } from "./unencrypted-keystore-file.js";

export class UnencryptedKeystore implements Keystore {
  #keystoreData: UnencryptedKeystoreFile | null;

  constructor() {
    this.#keystoreData = null;
  }

  public async listKeys(): Promise<string[]> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    return Object.keys(this.#keystoreData.keys);
  }

  public async hasKey(key: string): Promise<boolean> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    return Object.keys(this.#keystoreData.keys).includes(key);
  }

  public async readValue(key: string): Promise<string | undefined> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    return this.#keystoreData.keys[key];
  }

  public async removeKey(key: string): Promise<void> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    delete this.#keystoreData.keys[key];
  }

  public async addNewValue(key: string, value: string): Promise<void> {
    this.#assertKeystoreInitialized(this.#keystoreData);

    this.#keystoreData.keys[key] = value;
  }

  public async init(): Promise<void> {
    const keystoreFile: UnencryptedKeystoreFile =
      createUnencryptedKeystoreFile();

    this.#keystoreData = keystoreFile;
  }

  public loadFromJSON(json: any): Keystore {
    const keystore: UnencryptedKeystoreFile = json;

    this.#throwIfInvalidKeystoreFormat(keystore);

    this.#keystoreData = keystore;

    return this;
  }

  public toJSON(): UnencryptedKeystoreFile {
    this.#assertKeystoreInitialized(this.#keystoreData);

    return this.#keystoreData;
  }

  #assertKeystoreInitialized(
    keystoreFile: UnencryptedKeystoreFile | null,
  ): asserts keystoreFile is UnencryptedKeystoreFile {
    assertHardhatInvariant(keystoreFile !== null, "Keystore not initialized");
  }

  #throwIfInvalidKeystoreFormat(keystore: UnencryptedKeystoreFile): void {
    try {
      unencryptedKeystoreFileSchema.parse(keystore);
    } catch (error) {
      throw new HardhatError(
        HardhatError.ERRORS.KEYSTORE.INVALID_KEYSTORE_FILE_FORMAT,
      );
    }
  }
}
