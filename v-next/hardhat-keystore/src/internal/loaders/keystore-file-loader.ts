import type {
  FileManager,
  Keystore,
  KeystoreLoader,
  UnencryptedKeystoreFile,
} from "../types.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";
import { unencryptedKeystoreFileSchema } from "../types-validation.js";

export class KeystoreFileLoader implements KeystoreLoader {
  readonly #keystoreFilePath: string;
  readonly #fileManager: FileManager;
  #keystoreCache: UnencryptedKeystore | null;

  constructor(keystoreFilePath: string, fileManger: FileManager) {
    this.#keystoreFilePath = keystoreFilePath;
    this.#fileManager = fileManger;

    this.#keystoreCache = null;
  }

  public async isKeystoreUninitialized(): Promise<boolean> {
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

    this.#throwIfInvalidKeystoreFormat(keystoreFile);

    const keystore = new UnencryptedKeystore(keystoreFile);
    this.#keystoreCache = keystore;

    return keystore;
  }

  public async createUnsavedKeystore(): Promise<Keystore> {
    assertHardhatInvariant(
      this.#keystoreCache === null,
      "Cannot create a new Keystore when one is already loaded",
    );

    const keystore = new UnencryptedKeystore(
      UnencryptedKeystore.createEmptyUnencryptedKeystoreFile(),
    );
    this.#keystoreCache = keystore;

    return keystore;
  }

  public async saveToKeystoreFile(): Promise<void> {
    assertHardhatInvariant(
      this.#keystoreCache !== null,
      "Cannot save a keystore that has not been loaded or created",
    );

    const keystoreFile = this.#keystoreCache.toJSON();

    await this.#fileManager.writeJsonFile(this.#keystoreFilePath, keystoreFile);
  }

  #throwIfInvalidKeystoreFormat(keystore: UnencryptedKeystoreFile): void {
    try {
      unencryptedKeystoreFileSchema.parse(keystore);
    } catch (error) {
      throw new HardhatError(
        HardhatError.ERRORS.KEYSTORE.INVALID_KEYSTORE_FILE_FORMAT,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
