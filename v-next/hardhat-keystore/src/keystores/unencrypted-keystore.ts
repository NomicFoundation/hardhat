import type { Keystore, KeystoreFile } from "../types.js";

import { writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";

import { assertFilePath } from "../utils/assert-file-path.js";
import { assertKeyStore } from "../utils/assert-keystore.js";

export class UnencryptedKeystore implements Keystore {
  readonly #keystoreCache: KeystoreFile;
  readonly #keystoreFilePath: string;

  constructor(keystoreFile: KeystoreFile, keyStoreFilePath: string) {
    this.#keystoreCache = keystoreFile;
    this.#keystoreFilePath = keyStoreFilePath;
  }

  public async listKeys(): Promise<string[]> {
    assertKeyStore(this.#keystoreCache);

    return Object.keys(this.#keystoreCache.keys);
  }

  public async readValue(key: string): Promise<string | undefined> {
    assertKeyStore(this.#keystoreCache);

    return this.#keystoreCache.keys[key];
  }

  public async removeKey(key: string): Promise<void> {
    assertKeyStore(this.#keystoreCache);

    delete this.#keystoreCache.keys[key];

    assertFilePath(this.#keystoreFilePath);
    await writeJsonFile(this.#keystoreFilePath, this.#keystoreCache);
  }

  public async addNewSecret(key: string, secret: string): Promise<void> {
    assertKeyStore(this.#keystoreCache);
    assertFilePath(this.#keystoreFilePath);

    this.#keystoreCache.keys[key] = secret;
    await writeJsonFile(this.#keystoreFilePath, this.#keystoreCache);
  }
}
