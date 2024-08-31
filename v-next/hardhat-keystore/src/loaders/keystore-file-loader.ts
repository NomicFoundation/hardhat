import type { Keystore, KeystoreLoader } from "../types.js";

import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

export class KeystoreFileLoader implements KeystoreLoader {
  readonly #keystoreFilePath: string;
  readonly #keystoreFactory: () => Keystore;

  constructor(keystoreFilePath: string, keystoreFactory: () => Keystore) {
    this.#keystoreFilePath = keystoreFilePath;

    this.#keystoreFactory = keystoreFactory;
  }

  public async exists(): Promise<boolean> {
    return exists(this.#keystoreFilePath);
  }

  public async load(): Promise<Keystore> {
    const keystoreFile = await readJsonFile(this.#keystoreFilePath);

    const keystore = this.#keystoreFactory().loadFromJSON(keystoreFile);

    return keystore;
  }

  public async create(): Promise<Keystore> {
    const keystore = this.#keystoreFactory();

    await keystore.init();

    await writeJsonFile(this.#keystoreFilePath, keystore.toJSON());

    return keystore;
  }

  public async save(keystore: Keystore): Promise<void> {
    await writeJsonFile(this.#keystoreFilePath, keystore);
  }
}
