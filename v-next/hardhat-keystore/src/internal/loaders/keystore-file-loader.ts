import type { FileManager, Keystore, KeystoreLoader } from "../types.js";

import { UnencryptedKeystore } from "../keystores/unencrypted-keystore.js";

export class KeystoreFileLoader implements KeystoreLoader {
  readonly #keystoreFilePath: string;
  readonly #fileManager: FileManager;

  constructor(keystoreFilePath: string, fileManger: FileManager) {
    this.#keystoreFilePath = keystoreFilePath;
    this.#fileManager = fileManger;
  }

  public async exists(): Promise<boolean> {
    return this.#fileManager.fileExists(this.#keystoreFilePath);
  }

  public async load(): Promise<Keystore> {
    const keystoreFile = await this.#fileManager.readJsonFile(
      this.#keystoreFilePath,
    );

    const keystore = new UnencryptedKeystore().loadFromJSON(keystoreFile);

    return keystore;
  }

  public async create(): Promise<Keystore> {
    return new UnencryptedKeystore().init();
  }

  public async save(keystore: Keystore): Promise<void> {
    const keystoreFile = keystore.toJSON();

    await this.#fileManager.writeJsonFile(this.#keystoreFilePath, keystoreFile);
  }
}
