import type { FileManager, KeystoreLoader } from "../types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import { createEmptyEncryptedKeystore } from "../keystores/encryption.js";
import { Keystore } from "../keystores/keystore.js";

export class KeystoreFileLoader implements KeystoreLoader {
  readonly #keystoreFilePath: string;
  readonly #fileManager: FileManager;
  #keystoreCache: Keystore | null;

  constructor(keystoreFilePath: string, fileManger: FileManager) {
    this.#keystoreFilePath = keystoreFilePath;
    this.#fileManager = fileManger;

    this.#keystoreCache = null;
  }

  public async isKeystoreInitialized(): Promise<boolean> {
    if (this.#keystoreCache !== null) {
      return true;
    }

    return this.#fileManager.fileExists(this.#keystoreFilePath);
  }

  public async loadKeystore(): Promise<Keystore> {
    if (this.#keystoreCache !== null) {
      return this.#keystoreCache;
    }

    const keystoreFile = await this.#fileManager.readJsonFile(
      this.#keystoreFilePath,
    );

    const keystore = new Keystore(keystoreFile);
    this.#keystoreCache = keystore;

    return keystore;
  }

  public async createUnsavedKeystore({
    masterKey,
    salt,
  }: {
    masterKey: Uint8Array;
    salt: Uint8Array;
  }): Promise<Keystore> {
    assertHardhatInvariant(
      this.#keystoreCache === null,
      "Cannot create a new Keystore when one is already loaded",
    );

    const keystore = new Keystore(
      createEmptyEncryptedKeystore({ masterKey, salt }),
    );

    this.#keystoreCache = keystore;

    return keystore;
  }

  public async saveKeystoreToFile(): Promise<void> {
    assertHardhatInvariant(
      this.#keystoreCache !== null,
      "Cannot save a keystore that has not been loaded or created",
    );

    const keystoreFile = this.#keystoreCache.toJSON();

    await this.#fileManager.writeJsonFile(this.#keystoreFilePath, keystoreFile);
  }
}
