import type { Keystore, KeystoreFile } from "../types.js";

import { writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";

export class UnencryptedKeystore implements Keystore {
  readonly #keystoreCache: KeystoreFile;
  readonly #keystoreFilePath: string;

  constructor(keystoreFile: KeystoreFile, keyStoreFilePath: string) {
    this.#keystoreCache = keystoreFile;
    this.#keystoreFilePath = keyStoreFilePath;
  }

  public async listKeys(): Promise<string[]> {
    return Object.keys(this.#keystoreCache.keys);
  }

  public async readValue(key: string): Promise<string | undefined> {
    return this.#keystoreCache.keys[key];
  }

  public async removeKey(key: string): Promise<void> {
    delete this.#keystoreCache.keys[key];
    await writeJsonFile(this.#keystoreFilePath, this.#keystoreCache);
  }

  public async addNewSecret(key: string, secret: string): Promise<void> {
    this.#keystoreCache.keys[key] = secret;
    await writeJsonFile(this.#keystoreFilePath, this.#keystoreCache);
  }
}
