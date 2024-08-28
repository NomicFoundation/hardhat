import type { Keystore, KeystoreFile } from "../types.js";

import { writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";
import chalk from "chalk";

import { io } from "../ui/io.js";
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

    if (this.#keystoreCache.keys[key] === undefined) {
      io.error(`Key "${key}" not found`);
      return;
    }

    delete this.#keystoreCache.keys[key];

    assertFilePath(this.#keystoreFilePath);
    await writeJsonFile(this.#keystoreFilePath, this.#keystoreCache);

    io.info(`Key "${key}" removed`);
  }

  public async addNewSecret(key: string, force: boolean): Promise<void> {
    assertKeyStore(this.#keystoreCache);
    assertFilePath(this.#keystoreFilePath);

    if (this.#keystoreCache.keys[key] !== undefined && !force) {
      io.warn(
        `The key "${key}" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
      );
      return;
    }

    const secret = await io.requestSecretInput("Enter secret to store: ");

    if (secret.length === 0) {
      io.error("The secret cannot be empty.");
      return;
    }

    this.#keystoreCache.keys[key] = secret;
    await writeJsonFile(this.#keystoreFilePath, this.#keystoreCache);
  }
}
