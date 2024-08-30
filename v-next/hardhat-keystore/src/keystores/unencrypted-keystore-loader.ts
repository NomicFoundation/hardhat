import type {
  Keystore,
  KeystoreFile,
  KeystoreLoader,
  RawInterruptions,
} from "../types.js";

import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

import { setUpPassword } from "../ui/password-manager.js";

import { UnencryptedKeystore } from "./unencrypted-keystore.js";

export class UnencryptedKeystoreLoader implements KeystoreLoader {
  readonly #keystoreFilePath: string;
  readonly #interruptions: RawInterruptions;

  constructor(keystoreFilePath: string, interruptions: RawInterruptions) {
    this.#keystoreFilePath = keystoreFilePath;
    this.#interruptions = interruptions;
  }

  public async load(): Promise<Keystore | undefined> {
    const fileExists = await exists(this.#keystoreFilePath);
    if (fileExists === false) {
      return undefined;
    }

    const keystore: KeystoreFile = await readJsonFile(this.#keystoreFilePath);

    return new UnencryptedKeystore(keystore, this.#keystoreFilePath);
  }

  public async create(): Promise<Keystore> {
    await this.#interruptions.info("\n👷🔐 Hardhat-Keystore 🔐👷\n");

    await setUpPassword(this.#interruptions);

    const keystore = {
      version: "",
      keys: {},
    };

    await writeJsonFile(this.#keystoreFilePath, keystore);

    return new UnencryptedKeystore(keystore, this.#keystoreFilePath);
  }
}
